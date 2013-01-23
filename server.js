var sys = require("sys");
var http = require("http");
var path = require("path");
var url = require("url");
var MongoClient = require('mongodb').MongoClient;
var fs = require("fs");

function getCookies(request) {
  var cookies = {};
  if (request.headers.cookie) {
    request.headers.cookie.split(';').forEach(function(cookie) {
      var parts = cookie.split('=');
      var name = parts[0].trim(); 
      var value = (parts[1] || '').trim();
      cookies[name] = value;
    });
  }
  return cookies; 
}

http.createServer(function(request, response) {
  var cookies = getCookies(request);
  var pathname = url.parse(request.url).pathname;
  if (pathname == "/") pathname = "/index.html";
  if (request.method === "POST") {
    var post_params = {};
    if (request.headers['content-type'] == "application/x-www-form-urlencoded") {
      var body = "";
      request.on('data', function(chunk) {
        body += chunk;
      }); 
      var post_params = {};
      request.on('end', function() {
        sys.puts(body + ': ' + body);
        var pairs = body.split('&');
        for (i in pairs) {
          var pair = pairs[i].split('=');
          var param_name = pair[0];
          var param_value = pair[1];
          sys.puts(param_name + ': ' + param_value);
          post_params[param_name] = param_value;
        }

        if (pathname == "/adduser") {
          sys.puts("adduser!!!");
          if ( post_params["confirmation"] != "Garr") {
            response.writeHead(302, {
              'Location': 'adduser.html'
            });
            response.end();
          }
          
          if (post_params["password"] != post_params["confirmPassword"]) {
            response.writeHead(302, {
              'Location': 'adduser.html?code=1'
            });
            response.end();
          }
          MongoClient.connect("mongodb://localhost:27017/reakncrew", function(err, db) {
            if (err) { return console.dir(err); }

            sys.puts("connected to mongodb");
            var users = db.collection('users');
            var user = {
              'username': post_params['username'],
              'password': post_params['password']
            };
            sys.puts("user: " + user);
            sys.puts("insert user in mongodb");
            users.insert(user, {w: 1}, function(err, result) {
              sys.puts("err: " + err);
              sys.puts("result: " + result);
            });
          });
        }
      });
    }
  } else {
    var full_path = path.join(process.cwd(), pathname);
    fs.exists(full_path,function(exists) {
      if (!exists) {
        response.writeHeader(404, {"content-type": "text/plain" });
        response.write("404 Not Found\n");
        response.end();
      } else {
        fs.readFile(full_path, "binary", function(err, file) {
          if (err) {
            response.writeHeader(500, { "Content-Type": "text/plain"}); 
            response.write(err + "\n");
            response.end();
          } else {
            response.writeHeader(200);
            response.write(file, "binary");
            response.end();
          }
        });
      }
    });
  }
}).listen(8080);
sys.puts("Server Running on 8080");

