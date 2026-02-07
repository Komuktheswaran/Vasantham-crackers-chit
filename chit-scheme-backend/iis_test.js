const http = require('http');

http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello everyone, IISNode is working!');
}).listen(process.env.PORT || 8080);
