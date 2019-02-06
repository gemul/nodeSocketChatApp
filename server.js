"use strict";
process.title = 'node-chat';
// Port where we'll run the websocket server
var webSocketPort = 1337;
// websocket server
var webSocketServer = require('websocket').server;
// http server
var http = require('http');

/**
 * Global variables
 */
// chat history array
var history = [ ];
// list of currently connected clients
var clients = [ ];
// Array with some colors
var colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
// ... in random order
colors.sort(function(a,b) { return Math.random() > 0.5; } );

/**
 * Helper function to escape strings input into html-safe characters
 * String htmlEntities(String str);
 */
function htmlEntities(str) {
  return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
  // nothing here, we're making websocket server.
  // but websocket is tied to a HTTP server, so we need 
  // this http server.
});
server.listen(webSocketPort, function() {
  console.log((new Date()) + " Server is listening on port "
      + webSocketPort);
});

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
  // WebSocket server is tied to a HTTP server. WebSocket
  // request is just an enhanced HTTP request. For more info 
  // http://tools.ietf.org/html/rfc6455#page-6
  httpServer: server
});
// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
  console.log((new Date()) + ' Connection from '
      + request.origin + '.');
  // accept connection - you should check 'request.origin' to
  // make sure that client is connecting from same origin
  // (http://en.wikipedia.org/wiki/Same_origin_policy)
  // now let's just pass the request.origin.
  var connection = request.accept(null, request.origin); 
  console.log((new Date()) + ' Accepting connection from '+connection.remoteAddress);
  // store the connection in client array and save the index
  // we need to know client index to remove them on 'close' event
  var index = clients.push(connection) - 1;
  var userName = false;
  var userColor = false;
  console.log((new Date()) + ' Connection of client index '+index+' accepted.');
  // send back chat history
  if (history.length > 0) {
    connection.sendUTF(
        JSON.stringify({ type: 'history', data: history} ));
  } else {
    //if the chat is still empty
    connection.sendUTF(
      JSON.stringify({
        type: 'message', data: {
          time: (new Date()).getTime(),
          text: htmlEntities("Pick a name and type anything to start the chat"),
          author: 'SYSTEM',
          color: 'black'
        } 
      }));
  }
  // user sent some message
  connection.on('message', function(message) {
    if (message.type === 'utf8') { // accept only text
    // first message sent by user is their name
     if (userName === false) {
        // remember user name
        userName = htmlEntities(message.utf8Data);
        // get random color and send it back to the user
        userColor = colors.shift();
        connection.sendUTF(
            JSON.stringify({ type:'color', data: userColor }));
        console.log((new Date()) + ' User is known as: ' + userName
                    + ' with ' + userColor + ' color.');
      } else { // log and broadcast the message
        console.log((new Date()) + ' Received Message from '
                    + userName + ': ' + message.utf8Data);
        
        // we want to keep history of all sent messages
        var obj = {
          time: (new Date()).getTime(),
          text: htmlEntities(message.utf8Data),
          author: userName,
          color: userColor
        };
        history.push(obj);
        history = history.slice(-100);
        // broadcast message to all connected clients
        var json = JSON.stringify({ type:'message', data: obj });
        for (var i=0; i < clients.length; i++) {
          clients[i].sendUTF(json);
        }
      }
    }
  });
  // user disconnected
  connection.on('close', function(connection) {
    if (userName !== false && userColor !== false) {
      console.log((new Date()) + " Peer "
          + connection.remoteAddress + " disconnected.");
      // remove user from the list of connected clients
      clients.splice(index, 1);
      // push back user's color to be reused by another user
      colors.push(userColor);
    }
  });
});