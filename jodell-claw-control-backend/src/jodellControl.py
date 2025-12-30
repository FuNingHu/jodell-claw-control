#!/usr/bin/env python
# coding:utf-8

import sys
import os
import socket
from logger import *
from xmlrpc.server import SimpleXMLRPCServer
from xmlrpc.server import SimpleXMLRPCRequestHandler
from socketserver import ThreadingMixIn


import serial
import time
import serial.tools.list_ports
import modbus_tk.defines as cst
from modbus_tk import modbus_rtu

# from SimpleXMLRPCServer import SimpleXMLRPCServer
# from SocketServer import ThreadingMixIn

XMLRPC_PORT = 46666
myId = "9"
master = None
scanId = 0
startId = 0
stopId = 247
connectState = "false"
activateState = "false"
programState = "false"

clawStateZn = {
	0:"正在运行",
	1:"张开时受阻",
	2:"闭合时受阻",
	3:"到位"
}

clawStateEn = {
	0:"Running",
	1:"Blocked when opening",
	2:"Blocked when closing",
	3:"In place"
}


def setMyId(newId): # device slave station address
	global myId
	myId = newId
	return myId

def getWarningInfo(language):
	return "Warning" if language == "2" else "警告"

def getProgramError(language):
	return "Program exception" if language == "2" else "程序异常"

def getComError(language):
	return "No serial port available" if language == "2" else "没有可用的串行端口"

def getComOperationError(language):
	return "Serial port operation failed" if language == "2" else "串口操作失败"

def getMyId(): #获取从站地址
	return myId
	
def searchCom(): #**
    plist = list(serial.tools.list_ports.comports())
    if len(plist) <= 0:
        return "No serial port available!!!"
    else:
        for i in range(len(plist)):
            plist_0 = list(plist[i])
            if "ttyUSB" in str(plist_0):
                return str(plist_0)

def openMaster(com, bau): # Open port， bau 115200
    try:
        global master, connectState
        master = modbus_rtu.RtuMaster(serial.Serial(port=com, 
													baudrate=int(bau), 
													bytesize=8, 
													parity=serial.PARITY_NONE, 
													stopbits=serial.STOPBITS_ONE))
        master.set_timeout(1.0)
        master.set_verbose(True)
        connectState = "true"
        return "OK "
    except Exception as exc:
        print(f"Error: {exc}")
        return str(exc)

def closeMaster(): #关闭通信
	try:	
		time.sleep(1)
		global master, connectState
		master._do_close()
		master = None
		connectState = "false"
		return "OK"
	except Exception as exc:
		return str(exc)

def getConnectState():   
	return connectState

def enableClaw(): #激活设备
	try:
		global activateState
		sendCmdBuf = [0x01]
		master.execute(int(myId), cst.WRITE_MULTIPLE_REGISTERS, 1000, output_value=sendCmdBuf)
		activateState = "true"
		return "OK"
	except Exception as exc:
		return str(exc)

def disableClaw():  #禁用设备
	try:
		global activateState
		sendCmdBuf = [0x00]
		master.execute(int(myId), cst.WRITE_MULTIPLE_REGISTERS, 1000, output_value=sendCmdBuf)
		activateState = "false"
		return "OK"
	except Exception as exc:
		return str(exc)

def getActivateState():  
	return activateState
	
def setActivateState(data):
	global activateState
	activateState = data
	return activateState

def doCmd(pos, speed, torque):  #执行命令
	try:
		sendCmdBuf = [0x0009, 0x0000, 0x000]
		sendCmdBuf[1]= (255 - int(pos)) << 8
		sendCmdBuf[2] = int(speed) | int(torque) << 8
		master.execute(int(myId), cst.WRITE_MULTIPLE_REGISTERS, 1000, output_value=sendCmdBuf)
		return "OK"
	except Exception as exc:
		return str(exc)

def readInPlaceStatus(status, language, timeout): #读到位状态 “error” "OK"
	startTime = time.time()
	try:
		info = "error"
		while True:
			readBuf = master.execute(int(myId), cst.READ_HOLDING_REGISTERS, 2000, 1)
			newTime = time.time()
			curState = ((readBuf[0] & 0xff) >> 6) & 0x03
			if abs(newTime - startTime) > float(timeout):
				if language == "2":
					info = "State error, Current state:{}, Target state:{}".format(clawStateEn[curState], clawStateEn[int(status)])
				else:
					info = "状态错误,当前状态:{},目标状态:{}".format(clawStateZn[curState], clawStateZn[int(status)])
				break
			if int(status) == curState:
				info = "OK"
				break
		return info
	except Exception as exc:
		return str(exc)

def readActivateStatus(): # 返回状态 “error” "OK" ""
	try:
		info = "error"
		readBuf = master.execute(int(myId), cst.READ_HOLDING_REGISTERS, 2000, 1)
		if ((readBuf[0] & 0xff) >> 4) & 0x03 == 0x03:
			info = "OK"
		else:
			info = ""
		return info
	except Exception as exc:
		return str(exc)

def setStartId(value):  #设置搜索的起始地址
	global startId
	startId = int(value) - 1
	return "OK"

def setStopId(value):
	global stopId
	stopId = int(value)
	return "OK"


def initScanId(): #reset scan
	global scanId
	scanId = startId
	return "OK"
	

def searchId(language):  #执行搜索id的功能
    try:
        global myId, scanId
        scanId += 1
        info = "error"
        time.sleep(0.1)
        if scanId > stopId:
            return "Gripper not scanned" if language == "2" else "未扫描到夹爪"
        readBuf = master.execute(scanId, cst.READ_HOLDING_REGISTERS, 2000, 4)
        info = "OK"
        myId = str(scanId)
        return info
    except Exception as exc:
        return "error"

        
def repeatReadActivateState():  #GUI逻辑控制
	startTime = time.time()
	try:
		info = "error"
		while True:
			readBuf = master.execute(int(myId), cst.READ_HOLDING_REGISTERS, 2000, 1)
			newTime = time.time()
			if abs(newTime - startTime) > 10:
				break
			if ((readBuf[0] & 0xff) >> 4) & 0x03 == 0x03:
				info = "OK"
				break
		return info
	except Exception as exc:
		return str(exc)

def getCurPos():    #拿回当前位置
	try:
		info = "error"
		readBuf = master.execute(int(myId), cst.READ_HOLDING_REGISTERS, 2001, 1)
		info = str(readBuf[0] >> 8)
		return info
	except Exception as exc:
		return "error"
def tool_modbus_read(register_address):
	try:
		info = "error"
		readBuf = master.execute(int(myId), cst.READ_HOLDING_REGISTERS, int(register_address), 1)
		info = str(readBuf[0])
		return info
	except Exception as exc:
		return "error"

def getCurSpeed():
	try:
		info = "error"
		readBuf = master.execute(int(myId), cst.READ_HOLDING_REGISTERS, 2002, 1)
		info = str(readBuf[0] >> 8)
		return info
	except Exception as exc:
		return "error"

def getCurTorque():
	try:
		info = "error"
		readBuf = master.execute(int(myId), cst.READ_HOLDING_REGISTERS, 2002, 1)
		info = str(readBuf[0] & 0xff)
		return info
	except Exception as exc:
		return "error"

def getErrorInfo():
	try:
		info = "error"
		readBuf = master.execute(int(myId), cst.READ_HOLDING_REGISTERS, 2001, 1)
		info = str(readBuf[0] & 0xff)
		return info
	except Exception as exc:
		return "error"

def getProgramState():
	return programState

def setProgramState(data):
	global programState
	programState = data
	return programState

def jd_add(nb1, nb2):
	return nb1 + nb2
	

class RequestHandler(SimpleXMLRPCRequestHandler):
	rpc_paths = ('/',)

	def log_message(self, format, *args):
		pass

sys.stdout.write("Jodell daemon started")
sys.stderr.write("Jodell daemon started")

class MultithreadedSimpleXMLRPCServer(ThreadingMixIn, SimpleXMLRPCServer):
	pass

server = MultithreadedSimpleXMLRPCServer(("0.0.0.0", XMLRPC_PORT), requestHandler=RequestHandler)
server.RequestHandlerClass.protocol_version = "HTTP/1.1"
server.register_function(setMyId, "setMyId")
server.register_function(getMyId, "getMyId")
server.register_function(searchCom, "searchCom")
server.register_function(openMaster, "openMaster")
server.register_function(closeMaster, "closeMaster")
server.register_function(getConnectState, "getConnectState")
server.register_function(enableClaw, "enableClaw")
server.register_function(disableClaw, "disableClaw")
server.register_function(getActivateState, "getActivateState")
server.register_function(setActivateState, "setActivateState")
server.register_function(doCmd, "doCmd")
server.register_function(readInPlaceStatus, "readInPlaceStatus")
server.register_function(getWarningInfo, "getWarningInfo")
server.register_function(getComError, "getComError")
server.register_function(getProgramError, "getProgramError")
server.register_function(getComOperationError, "getComOperationError")
server.register_function(readActivateStatus, "readActivateStatus")
server.register_function(searchId, "searchId")
server.register_function(initScanId, "initScanId")
server.register_function(setStartId, "setStartId")
server.register_function(setStopId, "setStopId")
server.register_function(getCurPos, "getCurPos")
server.register_function(getCurSpeed, "getCurSpeed")
server.register_function(getCurTorque, "getCurTorque")
server.register_function(getErrorInfo, "getErrorInfo")
server.register_function(getProgramState, "getProgramState")
server.register_function(setProgramState, "setProgramState")
server.register_function(repeatReadActivateState, "repeatReadActivateState")
server.register_function(jd_add, "jd_add")
server.register_function(tool_modbus_read, "tool_modbus_read")
server.serve_forever()


