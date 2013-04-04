#include <cstdio>
#include <string.h>
#include "stdafx.h"
#include "mongoose.h"
#include "pkg.h"
#include <json/json.h>

using namespace std;

pkg generator;

// This function will be called by mongoose on every new request.
static int begin_request_handler(struct mg_connection *conn) {
	const struct mg_request_info *ri = mg_get_request_info(conn);
	char post_data[1024], input1[sizeof(post_data)], input2[sizeof(post_data)];
	int post_data_len;
	char content[200]; char privatekey[200];
	
	post_data_len = mg_read(conn, post_data, sizeof(post_data));

	mg_get_var(post_data, post_data_len, "status", input1, sizeof(input1));
	mg_get_var(post_data, post_data_len, "id", input2, sizeof(input2));
	
	cout << "Status: " << input1 << endl;
	cout << "Id: " << input2 << endl;

	if(strcmp(input1, "extract") == 0){

		generator.ibe_extract(input2, privatekey);
		cout << "Key: " << privatekey << endl;
		/*string json_string = "{ \"privatekey\": \"" << privatekey << "\" }";

		int content_length = _snprintf(content, sizeof(content),
									json_string);	

		mg_printf(conn, "HTTP/1.0 200 OK\r\n"
				  "Content-Length: %d\r\n"
				  "Content-Type: text/html\r\n\r\n%s",
				  content_length, content);*/
		int content_length = _snprintf(content, sizeof(content),
									privatekey);	
		mg_printf(conn, "HTTP/1.0 200 OK\r\n"
				  "Content-Length: %d\r\n"
				  "Content-Type: text/html\r\n\r\n%s",
				  content_length, content);
	}else{
		
		int content_length = _snprintf(content, sizeof(content),
									"Bad input");	

		mg_printf(conn, "HTTP/1.0 200 OK\r\n"
				  "Content-Length: %d\r\n"
				  "Content-Type: text/html\r\n\r\n%s",
				  content_length, content);
	}
	  
	return 1;
}

int _tmain(int argc, _TCHAR* argv[]) {
	struct mg_context *ctx;
	struct mg_callbacks callbacks;
	//Json::Value root;
	generator.ibe_setup();
	
	//generator.ibe_encryption();
	//generator.ibe_decryption();
	
	// List of options. Last element must be NULL.
	const char *options[] = {"listening_ports", "8080", NULL};
	
	// Prepare callbacks structure. We have only one callback, the rest are NULL.
	memset(&callbacks, 0, sizeof(callbacks));
	callbacks.begin_request = begin_request_handler;

	// Start the web server.
	ctx = mg_start(&callbacks, NULL, options);

	// Wait until user hits "enter". Server is running in separate thread.
	// Navigating to http://localhost:8080 will invoke begin_request_handler().
	getchar();
	getchar();
	
	// Stop the server.
	mg_stop(ctx);
	
	return 0;
}