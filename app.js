//app.js
var express = require('express');
var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
 
serv.listen(3000);
console.log("Server started.");

var SOCKET_LIST = {};
var PLAYER_LIST = {};

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    console.log(socket.id + " connected.");
 	
    socket.on('play',function(data){
    	console.log(data.name);
    	socket.emit('playResponse',{success:true});
    });

    socket.on('disconnect',function(){
    	console.log(socket.id + " disconnected.");
        delete SOCKET_LIST[socket.id];
    });
   
});