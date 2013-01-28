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

function cookieString(cookie) {
  var string = cookie.name + '=' + cookie.value;
  if (cookie['domain']) string += ';Domain=' + cookie['domain'];
  if (cookie['path']) string += ';Path=' + cookie['path'];
  if (cookie['comment']) string += ';Comment=' + cookie['comment'];
  if (cookie['maxage']) string += ';Max-Age=' + cookie['maxage'];
  if (cookie['version']) string += ';Version=' + cookie['version'];
  if (cookie['secure']) string += ';Secure';
  return string;
}

function setCookie(response, cookie) {
  response.setHeader("Set-Cookie", cookieString(cookie));
}

function setCookies(response, cookies) {
  response.setHeader("Set-Cookie", cookies.map(cookieString));
}

var MIMETYPES = {
  "html": "text/html",
  "css": "text/css",
  "js": "text/javascript"
}

function mimeType(path) {
  var n = path.lastIndexOf('.');
  var ext = (n > -1) ? path.substring(n + 1) : '';
  if (MIMETYPES[ext]) {
    return MIMETYPES[ext];
  } else {
    return "text/plain";
  }
}

http.createServer(function(request, response) {
  var cookies = getCookies(request);
  var pathname = url.parse(request.url).pathname;
  if (pathname == "/") pathname = "/index.html";
  sys.puts("pathname: " + pathname);
  if (request.method === "POST") {
    sys.puts("POST");
    sys.puts("content-type: " + request.headers['content-type']);
    var post_params = {};
    var contentType = request.headers['content-type'].split(';')[0];
    if (contentType == "application/x-www-form-urlencoded") {
      var body = "";
      request.on('data', function(chunk) {
        body += chunk;
      }); 
      var post_params = {};
      request.on('end', function() {
        var pairs = body.split('&');
        for (i in pairs) {
          var pair = pairs[i].split('=');
          var param_name = pair[0].trim();
          var param_value = decodeURIComponent((pair[1] || '').trim());
          if (param_name != '') {
            post_params[param_name] = param_value;
            sys.puts(param_name + ": " + param_value);
          }
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
            response.writeHead(302, {
              'Location': 'adduser.html?code=2'
            });
            response.end();
          });
        } else if (pathname == "/login") {
          var username = post_params["username"];
          var password = post_params["password"];
          MongoClient.connect("mongodb://localhost:27017/reakncrew", function(err, db) {
            if (err) { return console.dir(err); }
            var users = db.collection('users');
            users.findOne({"username": username}, function(err, user) {
              if (user && user.password == password) {
                setCookie(response, {"name": "username", "value": username});
                response.writeHead(302, {
                  'Location': 'index.html'
                });
                response.end();
              } else {
                response.writeHead(302, {
                  'Location': 'login.html?code=2'
                });
                response.end();
              }
            });
          }); 
        } else if (pathname == "/shout" && post_params['username'] != "undefined") {
          sys.puts("/shout");
          var username = post_params['username'];
          var msg = post_params['msg'];
          sys.puts("username: " + username);
          sys.puts("msg: " + msg);
          MongoClient.connect("mongodb://localhost:27017/reakncrew", function(err, db) {
            if (err) { return console.dir(err); }
            var shouts = db.collection('shouts');
            var shout = {
              'username' : username,
              'shout' : msg
            };
            shouts.insert(shout, {w: 1}, function(err, result) {
              sys.puts("err: " + err);
              sys.puts("result: " + result);
              shouts.find().toArray(function(err, items) {
                response.writeHead(200, {
                  'Content-Type': 'text/json'
                });
                response.write(JSON.stringify(items));
                response.end();
              });
            });
          });
        } else if (pathname == "/shouts") {
          MongoClient.connect("mongodb://localhost:27017/reakncrew", function(err, db) {
           if (err) { return console.dir(err); }

           var shouts = db.collection('shouts');
           shouts.find().toArray(function(err, items) {
             response.writeHead(200, {
                  'Content-Type': 'text/json'
             });
             response.write(JSON.stringify(items));
             response.end();
           });
         });
        }
      });
    }
  } else { // GET
    sys.puts("GET");
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
            response.writeHeader(200, {"Content-Type": mimeType(full_path)});
            response.write(file, "binary");
            response.end();
          }
        });
      }
    });
  }
}).listen(8080);
sys.puts("Server Running on 8080");

