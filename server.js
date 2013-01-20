var sys = require("sys");
var my_http = require("http");
var path = require("path");
var url = require("url");
var fs = require("fs");
my_http.createServer(function(request, response) {
  var pathname = url.parse(request.url).pathname;
  if (pathname == "/") pathname = "/index.html";
  var full_path = path.join(process.cwd(), pathname);
  fs.exists(full_path,function(exists) {
    if (!exists) {
      response.writeHeader(404, {"content-type": "text/plain" });
      response.write("404 Not Found/n");
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
}).listen(8080);
sys.puts("Server Running on 8080");

