
if(!SampleWall){
	var SampleWall = {};
}

SampleWall.BrowserOverlay = {
	
	/**
	* Says 'Hello' to the user.
	*/
	sayHello : function(aEvent) {
		var message = "Hello World2";
		
		window.alert(message);
	}
	
};

var observer;
function startHttpObserver(){
	observer = new HttpRequestObserver();
	observer.start();
}

function stopHttpObserver(){
	observer.stop();
	delete observer;
	observer = null;
}

function HttpRequestObserver(){}

HttpRequestObserver.prototype = {
	
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
		}
	},
	
	onModifyRequest: function(oHttp){
		
		try {
			
			var uri = oHttp.URI.asciiSpec;
		
			if( uri.match('^https://www.facebook.com/ajax/updatestatus.php') ||
				uri.match('^http://www.facebook.com/ajax/updatestatus.php') ){
				Firebug.Console.log(uri);
				
				var visitor = new HeaderInfoVisitor(oHttp);
				var requestHeaders = visitor.visitRequest();
				var postData = visitor.getPostData();
				Firebug.Console.log(URLToArray(postData.body));
				
				//window.alert(uri);
			}
			
		}catch(e){
			Components.utils.reportError("onModifyRequest:general error");
			Components.utils.reportError(e);
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
	},
	
	removeFromListener: function(){
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
		.getService(Components.interfaces.nsIObserverService);
		
		observerService.removeObserver(this, "http-on-modify-request");
	}
	
}

function URLToArray(url){
	var request = {};
	
	var pairs = url.split('&');
	for(var i=0; i < pairs.length; i++){
		var pair = pairs[i].split('=');
		request[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1])
	}
	
	return request;
}

function HeaderInfoVisitor (oHttp) {
	this.oHttp = oHttp;
	this.headers = new Array();
}

HeaderInfoVisitor.prototype =  {
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

/*function httpRequestObserver(){
	Firebug.Console.log("start up observer");
	this.register();
};

httpRequestObserver.prototype = {
	
	observe: function(subject, topic, data){
		Firebug.Console.log("observed");
		if(topic == "http-on-modify-request"){
			Firebug.Console.log("caught one");
		}else{
			Firebug.Console.log("kinda");
		}
	},
	
	register: function(){
		var observerService = Cc["@mozilla.org/observer-service;1"]
			.getService(Ci.nsIObserverService);
		observerService.addObserver(this, "http-on-modify-request", false);
	},
	
	unregister: function(){
		var observerService = Cc["@mozilla.org/observer-service;1"]
			.getService(Ci.nsIObserverService);
		observerService.removeObserver(this, "http-on-modify-request");
	},
	
	QueryInterface: function(iid){
		if (idd.equals(Ci.nsISupports) ||
			idd.equals(Ci.nsIObserver)){
			return this;
		}
		throw Components.results.NS_NOINTERFACE;
	}
	
};*/

function pageLoad(event){
	if (event.originalTarget instanceof HTMLDocument) {
		var win = event.originalTarget.defaultView;
		//Make sure it's not inside an iframe
		if (!win.frameElement) {
			Firebug.Console.log("page loaded");
			//observer = new httpRequestObserver();
			startHttpObserver();
		}
	}
}

window.addEventListener("load", function () {
	// Add a callback to be run every time a document loads.
	// note that this includes frames/iframes within the document
	gBrowser.addEventListener("load", pageLoad, true);
}, false);
