if(!facebookWall){
	var facebookWall= {};
}

var observer = null;
var doc = null;

facebookWall.BrowserOverlay = {
	
	sayHello: function(event){
		var message = "hello world";
		
		window.alert(message);
	}
	
}

facebookWall.startHttpObserver = function(){
	observer = new facebookWall.HttpRequestObserver();
	observer.start();
}

facebookWall.stopHttpObserver = function(){
	observer.stop();
	delete observer;
	observer = null;
}

facebookWall.HttpRequestObserver = function(){}

facebookWall.HttpRequestObserver.prototype = {
	
	start: function(){
		this.requests = new Array();
		this.addToListener();
	},
	
	stop: function(){
		this.removeFromListener();
		this.requests = null;
	},
	
	observe: function(subject, topic, data){
		if (topic == 'http-on-modify-request') {
			subject.QueryInterface(Components.interfaces.nsIHttpChannel);
			this.onModifyRequest(subject);
		}else if (topic == 'http-on-examine-response'){
			subject.QueryInterface(Components.interfaces.nsIHttpChannel);
			this.onExamineResponse(subject);
		}
	},
	
	onExamineResponse: function(oHttp){
		
		var uri = oHttp.URI.asciiSpec;
		
		if( uri.match('^https://www.facebook.com/ajax/updatestatus.php') ||
			uri.match('^http://www.facebook.com/ajax/updatestatus.php') ){
			Firebug.Console.log("Request response received: " + uri);
			
			var visitor = new facebookWall.HeaderInfoVisitor(oHttp);
			var request = visitor.visitRequest();
			
			var newListener = new facebookWall.TracingListener();
			oHttp.QueryInterface(Components.interfaces.nsITraceableChannel);
			newListener.originalListener = oHttp.setNewListener(newListener);
			
			/*var newListener = new BindTracingListener(uri, request);
			oHttp.QueryInterface(Ci.nsITraceableChannel);
			newListener.originalListener = oHttp.setNewListener(newListener);*/
		}
		
	},
	
	onModifyRequest: function(oHttp){
		
		var uri = oHttp.URI.asciiSpec;
		
		if( uri.match('^https://www.facebook.com/ajax/updatestatus.php') ||
			uri.match('^http://www.facebook.com/ajax/updatestatus.php') ){
			Firebug.Console.log("Request being sent: " + uri);
			
			var visitor = new facebookWall.HeaderInfoVisitor(oHttp);
			var requestHeaders = visitor.visitRequest();
			var postData = visitor.getPostData();
			
			var postArray = facebookWall.URLToArray(postData.body);
			
			//Firebug.Console.log(postArray["xhpc_message"]);
			var encrypted = CryptoJS.AES.encrypt(postArray["xhpc_message"], "Secret Passphrase");
			
			postArray["xhpc_message"] = encrypted.toString();
			postArray["xhpc_message_text"] = encrypted.toString();
			
			postData = facebookWall.ArrayToURL(postArray);
			
			var tmp = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);
			if ("data" in tmp) { //the API has version differences- this will determine which version we're using
				// Gecko 1.9 or newer
				tmp.data = postData;
			}else {
				// 1.8 or older
				tmp.setData(postData, postData.length);
			}
			try {
				// Must change HttpChannel to UploadChannel to be able to access post data
				oHttp.QueryInterface(Components.interfaces.nsIUploadChannel);
				oHttp.setUploadStream(tmp, "application/x-www-form-urlencoded;charset=utf-8", -1);//replace default stream with modified "tmp"
				oHttp.requestMethod = "POST";
				oHttp.QueryInterface(Components.interfaces.nsIHttpChannel);
			} catch(e) {
				Components.utils.reportError("onModifyRequest:error setting request upload stream for edit");
				Components.utils.reportError(e);
			}
			
		}
	},
	
	QueryInterface: function(iid){
		if (!iid.equals(Components.interfaces.nsISupports) &&
			!iid.equals(Components.interfaces.nsIHttpNotify) &&
			!iid.equals(Components.interfaces.nsIObserver)) {
				throw Components.results.NS_ERROR_NO_INTERFACE;
		}
		return this;
	},
	
	addToListener: function(){
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
		.getService(Components.interfaces.nsIObserverService);
		
		observerService.addObserver(this, "http-on-modify-request", false);
		observerService.addObserver(this, "http-on-examine-response", false);
	},
	
	removeFromListener: function(){
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
		.getService(Components.interfaces.nsIObserverService);
		
		observerService.removeObserver(this, "http-on-examine-response");
		observerService.removeObserver(this, "http-on-modify-request");
	}
	
}

facebookWall.TracingListener = function(){}

facebookWall.TracingListener.prototype = {
	
	originalListerner: null,
	receivedData: null,
	
	onStartRequest: function(request, context){
		this.receivedData = [];
		this.originalListener.onStartRequest(request, context);
	},
	
	onDataAvailable: function(request, context, inputStream, offset, count){
		
		var binaryInputStream = this.CCIN("@mozilla.org/binaryinputstream;1",
									 "nsIBinaryInputStream");
		binaryInputStream.setInputStream(inputStream);
		
		/*var storageStream = this.CCIN("@mozilla.org/storagestream;1",
								 "nsIStorageStream");
		storageStream.init(8192, count, null);
		
		var binaryOutputStream = this.CCIN("@mozilla.org/binaryoutputstream;1",  
									  "nsIBinaryOutputStream");
		binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));*/
		
		// Copy received data as they come.
		var data = binaryInputStream.readBytes(count);
		//Firebug.Console.log(data);
		this.receivedData.push(data);
		/*binaryOutputStream.writeBytes(data, count);
		
		this.originalListener.onDataAvailable(request, 
											context,
											storageStream.newInputStream(0), 
											offset, 
											count);*/
		
	},
	
	onStopRequest: function(request, context, statusCode){
		
		var responseSource = this.receivedData.join();
		var prepend = responseSource.substring(0, 9);
		var stripped = responseSource.substring(9);
		var jsonProcessedData = JSON.parse(stripped);
		var html = jsonProcessedData.jsmods.markup[0][1].__html;
		
		//Firebug.Console.log(html);
		
		try {
			//Firebug.Console.log("Here: " + jQuery(('<div></div>').append(html).find('span')));
			//Firebug.Console.log("on the try");
			//QueryInterface into HttpChannel to access originalURI and requestMethod properties
			
			var tempDiv = doc.createElement('div');
			tempDiv.innerHTML = html;
			var span = jQuery(tempDiv).find('span.userContent');
			var rawText = jQuery(span).text();
			//Firebug.Console.log(rawText);
			
			var decrypted = CryptoJS.AES.decrypt(rawText, "Secret Passphrase").toString(CryptoJS.enc.Utf8);
			//Firebug.Console.log(decrypted);
			
			span = jQuery(span).text(decrypted);
			var newJsonData = jsonProcessedData;
			newJsonData.jsmods.markup[0][1].__html = tempDiv.innerHTML;
			stripped = JSON.stringify(newJsonData);
			
			var newResponseBody = prepend.concat(stripped);
			
			//Firebug.Console.log(newResponseBody);
			
			request.QueryInterface(Components.interfaces.nsIHttpChannel);
			
			var storageStream = this.CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
			storageStream.init(8192, newResponseBody.length, null);
			var binaryOutputStream = this.CCIN("@mozilla.org/binaryoutputstream;1","nsIBinaryOutputStream");
			binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
			
			binaryOutputStream.writeBytes(newResponseBody, newResponseBody.length);
			
			this.originalListener.onDataAvailable(request, context, storageStream.newInputStream(0),
						0, newResponseBody.length);
			
		}catch(e){
			Components.utils.reportError("onStopRequest:error");
			Components.utils.reportError(e);
		}
		
		this.originalListener.onStopRequest(request, 
											context, 
											statusCode); 
		
	},
	
	QueryInterface: function(iid){
		if (iid.equals(Components.interfaces.nsIStreamListener) ||
			iid.equals(Components.interfaces.nsISupports)){
			return this;
		}
		throw Components.results.NS_NOINTERFACE;
	},
	
	CCIN: function(cName, ifaceName){
		return Components.classes[cName].createInstance(Components.interfaces[ifaceName]);
	}
	
}

facebookWall.ArrayToURL = function(array){
	var pairs = [];
	for(var key in array)
		if(array.hasOwnProperty(key))
			pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(array[key]));
	return pairs.join('&');
}

facebookWall.URLToArray = function(url){
	var request = {};
	
	var pairs = url.split('&');
	for(var i=0; i < pairs.length; i++){
		var pair = pairs[i].split('=');
		request[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1])
	}
	
	return request;
}

facebookWall.HeaderInfoVisitor = function(oHttp) {
	this.oHttp = oHttp;
	this.headers = new Array();
}

facebookWall.HeaderInfoVisitor.prototype =  {
	extractPostData : function(visitor, oHttp) {
		
		function postData(stream) {
			// Scriptable Stream Constants
			this.seekablestream = stream;
			//this.stream = TamperUtils.createScriptableInputStream(this.seekablestream);
			this.stream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
			this.stream.init(this.seekablestream);
			
			// Check if the stream has headers
			this.hasheaders = false;
			this.body = 0;
			this.isBinary = true;
			if (this.seekablestream instanceof Components.interfaces.nsIMIMEInputStream) {
				this.seekablestream.QueryInterface(Components.interfaces.nsIMIMEInputStream);
				this.hasheaders = true;
				this.body = -1; // Must read header to find body
				this.isBinary = false;
			} else if (this.seekablestream instanceof Components.interfaces.nsIStringInputStream) {
				this.seekablestream.QueryInterface(Components.interfaces.nsIStringInputStream);
				this.hasheaders = true;
				this.body = -1; // Must read header to find body
			}
		}
		
		postData.prototype = {
			rewind: function() {
				this.seekablestream.seek(0,0);
			},
			
			tell: function() {
				return this.seekablestream.tell();
			},
			
			readLine: function() {
				var line = "";
				var size = this.stream.available();
				for (var i = 0; i < size; i++) {
					var c = this.stream.read(1);
					if (c == '\r') {
					} else if (c == '\n') {
						break;
					} else {
						line += c;
					}
				}
				return line;
			},
			
			// visitor can be null, function has side-effect of setting body
			visitPostHeaders: function(visitor) {
				if (this.hasheaders) {
					this.rewind();
					var line = this.readLine();
					while(line) {
						if (visitor) {
							// TamperUtils.log("Got a post header: [" + line + "]");
							var tmp = line.match(/^([^:]+):\s?(.*)/);
							// match can return null...
							if (tmp) {
								visitor.visitPostHeader(tmp[1], tmp[2]);
								// if we get a tricky content type, then we are binary
								// e.g. Content-Type=multipart/form-data; boundary=---------------------------41184676334
								if (!this.isBinary && tmp[1].toLowerCase() == "content-type" && tmp[2].indexOf("multipart") != "-1") {
									this.isBinary = true;
								}
							} else {
								visitor.visitPostHeader(line, "");
							}
						}
						line = this.readLine();
					}
					this.body = this.tell();
				}
			},
			
			getPostBody: function(visitor) {
				// Position the stream to the start of the body
				if (this.body < 0 || this.seekablestream.tell() != this.body) {
					this.visitPostHeaders(visitor);
				}
				
				var size = this.stream.available();
				if (size == 0 && this.body != 0) {
					// whoops, there weren't really headers..
					this.rewind();
					visitor.clearPostHeaders();
					this.hasheaders = false;
					this.isBinary   = false;
					size = this.stream.available();
				}
				var postString = "";
				try {
					// This is to avoid 'NS_BASE_STREAM_CLOSED' exception that may occurs
					// See bug #188328.
					for (var i = 0; i < size; i++) {
						var c = this.stream.read(1);
						c ? postString += c : postString+='\0';
					}
				} catch (ex) {
					return "" + ex;
				} finally {
					this.rewind();
					// this.stream.close();
				}
				// strip off trailing \r\n's
				while (postString.indexOf("\r\n") == (postString.length - 2)) {
					postString = postString.substring(0, postString.length - 2);
				}
				return postString;
			}
		};
		
		// Get the postData stream from the Http Object 
		try {
			// Must change HttpChannel to UploadChannel to be able to access post data
			oHttp.QueryInterface(Components.interfaces.nsIUploadChannel);
			// Get the post data stream
			if (oHttp.uploadStream) {
				// Must change to SeekableStream to be able to rewind
				oHttp.uploadStream.QueryInterface(Components.interfaces.nsISeekableStream);
				// And return a postData object
				return new postData(oHttp.uploadStream);
			}
		} catch (e) {
			Firebug.Console.log("Got an exception retrieving the post data: [" + e + "]");
			return "crap";
		}
		return null;
	},
	
	visitHeader : function(name, value) {
		this.headers[name] = value;
	},
	
	visitPostHeader : function(name, value) {
		if (!this.postBodyHeaders) {
			this.postBodyHeaders = {};
		}
		this.postBodyHeaders[name] = value;
	},
	
	clearPostHeaders : function() {
		if (this.postBodyHeaders) {
			delete this.postBodyHeaders;
		}
	},
	
	visitRequest : function () {
		this.headers = {};
		this.oHttp.visitRequestHeaders(this);
		
		// There may be post data in the request
		var postData = this.extractPostData(this, this.oHttp);
		if (postData) {
			var postBody = postData.getPostBody(this);
			if (postBody !== null) {
				this.postBody = {body : postBody, binary : postData.isBinary};
			}
		}
		return this.headers;
	},
	
	getPostData : function() {
		return this.postBody ? this.postBody : null;
	},
	
	getPostBodyHeaders : function() {
		return this.postBodyHeaders ? this.postBodyHeaders : null;
	},
	
	visitResponse : function () {
		this.headers = new Array();
		this.oHttp.visitResponseHeaders(this);
		return this.headers;
	}
};

facebookWall.pageLoad = function(event){
	if (event.originalTarget instanceof HTMLDocument) {
		var win = event.originalTarget.defaultView;
		doc = event.originalTarget;
		//Make sure it's not inside an iframe
		if (!win.frameElement) {
			
			Firebug.Console.log("page loaded");
			facebookWall.startHttpObserver();
			
		}
	}
}

window.addEventListener("load", function () {
	// Add a callback to be run every time a document loads.
	// note that this includes frames/iframes within the document
	gBrowser.addEventListener("load", facebookWall.pageLoad, true);
}, false);

/*var delay = function(aEvent) { 
	var doc = aEvent.originalTarget; setTimeout(function() { 
		example.run(doc,aEvent); 
	}, 1); 
};
var load = function() { 
	gBrowser.addEventListener("DOMContentLoaded", delay, true); 
};
window.addEventListener("pageshow", load, false);*/