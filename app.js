//app.js
var express = require('express');
var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

var port = 3000;
serv.listen(port);
console.log("Server started on port " + port + ".");

var SOCKET_LIST = {};

var Entity = function(param){
	var self = {
		x:100,
		y:100,
		spdX:0,
		spdY:0,
		id:"",
		map:'maplvl1',
	}
	if(param){
		if(param.x)
			self.x = param.x;
		if(param.y)
			self.y = param.y;
		if(param.map)
			self.map = param.map;
		if(param.id)
			self.id = param.id;
	}
	self.update = function(){
		self.updatePosition();
	}
	self.updatePosition = function(){
		self.x += self.spdX;
		self.y += self.spdY;
	}
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
	}
	return self;
}

var Player = function(param){
	var self = Entity(param);
	self.username = param.name;
	self.color = param.color;
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.maxSpd = 10;
	
	var super_update = self.update;
	self.update = function(){
		self.updateSpd();
		super_update();
	}
	
	self.updateSpd = function(){
		var oldX = self.x;
		var oldY = self.y;
		
		if(self.pressingRight)
			self.spdX = self.maxSpd;
		else if(self.pressingLeft)
			self.spdX = -self.maxSpd;
		else
			self.spdX = 0;
		
		if(self.pressingUp)
			self.spdY = -self.maxSpd;
		else if(self.pressingDown)
			self.spdY = self.maxSpd;
		else
			self.spdY = 0;

		if(socket !== undefined)
			socket.on('invalidPosition', function(){
				self.x = oldX;
				self.y = oldY
			});
	}
	
	self.getInitPack = function(){
		return {
			id:self.id,
			color:self.color,
			name:self.username,
			x:self.x,
			y:self.y,	
			map:self.map,
		};		
	}
	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			map:self.map,
		}	
	}
	
	Player.list[self.id] = self;
	
	initPack.player.push(self.getInitPack());
	return self;
}
Player.list = {};
Player.onConnect = function(socket,name,color){
	var map = 'maplvl1';
	var player = Player({
		username:name,
		id:socket.id,
		color:color,
		map:map,
	});
	socket.on('keyPress',function(data){
		if(data.inputId === 'left')
			player.pressingLeft = data.state;
		else if(data.inputId === 'right')
			player.pressingRight = data.state;
		else if(data.inputId === 'up')
			player.pressingUp = data.state;
		else if(data.inputId === 'down')
			player.pressingDown = data.state;
	});	
	
socket.on('changeMap',function(data){
	if(player.map === 'maplvl1')
		player.map = 'maplvl2';
	/*else
	*/
})

	socket.emit('init',{
		selfId:socket.id,
		player:Player.getAllInitPack(),
	})
}
Player.getAllInitPack = function(){
	var players = [];
	for(var i in Player.list)
		players.push(Player.list[i].getInitPack());
	return players;
}

Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}
Player.update = function(){
	var pack = [];
	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());		
	}
	return pack;
}

var DEBUG = true;

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	
	socket.on('play',function(data){;
		Player.onConnect(socket,data.name,data.color);
	});
	
	console.log(socket.id + " connected.");

	socket.on('disconnect',function(){
		console.log(socket.id + " disconnected.");
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);	
	});

	socket.on('sendMsgToServer',function(data){
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat',data.name + ': ' + data.value);
        }
    });
	
	socket.on('evalServer',function(data){
		if(!DEBUG)
			return;
		var res = eval(data);
		socket.emit('evalAnswer',res);		
	});
	
	
	
});

var initPack = {player:[]};
var removePack = {player:[]};


setInterval(function(){
	var pack = {
		player:Player.update(),
	}
	
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('init',initPack);
		socket.emit('update',pack);
		socket.emit('remove',removePack);
	}
	initPack.player = [];
	removePack.player = [];
	
},1000/25);