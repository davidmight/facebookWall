if(!facebookWall){
	var facebookWall= {};
}

var observer = null;
var doc = null;
var prefManager = null;
var consoleService = null;
var nIntervId;
var keyServer = "http://localhost:8080";
var RSAkey;
var firstTime = true;
var userId = 0;

facebookWall.init = function(){
	//consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
	prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	
}

facebookWall.BrowserOverlay = {
	
	sayHello: function(event){
		var message = "hello world";
		
		window.alert(message);
	},
	
	changePrefBool: function(pref){
		var value = prefs.getBoolPref(pref);
		prefManager.setBoolPref(pref, !value);
	}
	
}

facebookWall.decryptText = function(text){
	return cryptico.decrypt(text, RSAkey);
}

facebookWall.pageOpened = function(tabBody){
	userId = 0;
	var cookieMgr = Components.classes["@mozilla.org/cookiemanager;1"]
					.getService(Components.interfaces.nsICookieManager);
	
	for (var e = cookieMgr.enumerator; e.hasMoreElements();) {
		var cookie = e.getNext().QueryInterface(Components.interfaces.nsICookie);
		if(cookie.host.match(".facebook.com") && cookie.name.match("c_user")){
			//Components.utils.reportError("User: " + cookie.value);
			userId = cookie.value;
		}
	}
	
	if(userId != 0){
		if(!facebookWall.checkDir(userId)){
			facebookWall.createDir(userId);
		}
		
		if(!facebookWall.checkKeysExist(userId)){
			firstTime = false;
			
			var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			var password = {value: ""};
			var check = {value: "true"};
			var result = prompts.promptPassword(null, "RSA Passphrase", "Please enter password to generate keypair:", password, null, check);
			
			var PassPhrase = password.value;
			
			//var PassPhrase = "The Moon is a Harsh Mistress.";
			// The length of the RSA key, in bits.
			var Bits = 512; 
			
			RSAkey = cryptico.generateRSAKey(PassPhrase, Bits);
			var PublicKeyString = cryptico.publicKeyString(RSAkey);
			
			var json_str = '"type": "init", "id": "' + userId + '", "pubKey": "' + PublicKeyString + '"';
			//var str = {type: "init", id: userId, pubKey: PublicKeyString};
			//var json_str = JSON.stringify(str);
			//window.alert(json_str);
			//var json_str = str;
			//window.alert(json_str);
			//window.alert(json_str);
			
			facebookWall.writeKeyFiles(userId, PassPhrase, PublicKeyString);
			
			var request = new XMLHttpRequest();
			request.open("POST", keyServer);
			request.setRequestHeader("Content-Type", "application/json");
			request.overrideMimeType("text/plain");
			request.onload = function()
			{
				//window.alert("Response received: " + request.responseText);
			};
			request.send(json_str);
			
		}else if(firstTime){
			firstTime = false;
			RSAkey = facebookWall.getPrivateKey(userId);
		}
	}
	/*var dir = localFile.init('~/.ssh');
	window.alert(dir);*/
	
	//facebookWall.statusCheck(tabBody);
	
	//facebookWall.checkWall(tabBody);
}

facebookWall.createDir = function(id){
	Components.utils.import("resource://gre/modules/FileUtils.jsm");
 
	var dir = FileUtils.getDir("ProfD", [id + "-keypair"], true);
}

facebookWall.checkDir = function(id){
	var file = Components.classes["@mozilla.org/file/directory_service;1"].
           getService(Components.interfaces.nsIProperties).
           get("ProfD", Components.interfaces.nsIFile);
    file.append(id + "-keypair");
    if(file.exists()){
    	return true;
    }else{return false;}
}

facebookWall.checkKeysExist = function(id){
	var file = Components.classes["@mozilla.org/file/directory_service;1"].
           getService(Components.interfaces.nsIProperties).
           get("ProfD", Components.interfaces.nsIFile);
    file.append(id + "-keypair");
    file.append("rsaPub");
    
    var file2 = Components.classes["@mozilla.org/file/directory_service;1"].
           getService(Components.interfaces.nsIProperties).
           get("ProfD", Components.interfaces.nsIFile);
    file2.append(id + "-keypair");
    file2.append("rsa");
    
    if(file.exists() != true || file2.exists() != true){
    	return false;
    }else{return true;}
}

facebookWall.getPubKey = function(id){
	var file = Components.classes["@mozilla.org/file/directory_service;1"].
           getService(Components.interfaces.nsIProperties).
           get("ProfD", Components.interfaces.nsIFile);
    file.append(id + "-keypair");
    file.append("rsaPub");
	var data = "";
	
	var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
	              createInstance(Components.interfaces.nsIFileInputStream);
	var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
	              createInstance(Components.interfaces.nsIConverterInputStream);
	fstream.init(file, -1, 0, 0);
	cstream.init(fstream, "UTF-8", 0, 0); // you can use another encoding here if you wish
	 
	let (str = {}) {
	  let read = 0;
	  do { 
	    read = cstream.readString(0xffffffff, str); // read as much as we can and put it in str.value
	    data += str.value;
	  } while (read != 0);
	}
	cstream.close(); // this closes fstream
	 
	return data;
}

facebookWall.getPrivateKey = function(id){
	var data = "";
	
	var file = Components.classes["@mozilla.org/file/directory_service;1"].
           getService(Components.interfaces.nsIProperties).
           get("ProfD", Components.interfaces.nsIFile);
    file.append(id + "-keypair");
    file.append("rsa");
	var data = "";
	
	var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
	              createInstance(Components.interfaces.nsIFileInputStream);
	var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
	              createInstance(Components.interfaces.nsIConverterInputStream);
	fstream.init(file, -1, 0, 0);
	cstream.init(fstream, "UTF-8", 0, 0); // you can use another encoding here if you wish
	 
	let (str = {}) {
	  let read = 0;
	  do { 
	    read = cstream.readString(0xffffffff, str); // read as much as we can and put it in str.value
	    data += str.value;
	  } while (read != 0);
	}
	cstream.close(); // this closes fstream
	
	return cryptico.generateRSAKey(data, 512);
}

facebookWall.writeKeyFiles = function(id, passphrase, pubKey){
	var file = Components.classes["@mozilla.org/file/directory_service;1"].
           getService(Components.interfaces.nsIProperties).
           get("ProfD", Components.interfaces.nsIFile);
    file.append(id + "-keypair");
    file.append("rsaPub");
	//var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	//file.initWithPath("chrome://facebookwall/content/crypto/rsaPub");
	
	if(file.exists() == false){
		file.create( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
	}
	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
	// use 0x02 | 0x10 to open file for appending.
	//foStream.init(file, 0x02 | 0x10, 0666, 0);
	foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); 
	
	// if you are sure there will never ever be any non-ascii text in data you can
	// also call foStream.write(data, data.length) directly
	var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
	converter.init(foStream, "UTF-8", 0, 0);
	converter.writeString(pubKey);
	converter.close(); // this closes foStream
	
	var file = Components.classes["@mozilla.org/file/directory_service;1"].
           getService(Components.interfaces.nsIProperties).
           get("ProfD", Components.interfaces.nsIFile);
    file.append(id + "-keypair");
    file.append("rsa");
	
	if(file.exists() == false){
		file.create( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
	}
	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
	// use 0x02 | 0x10 to open file for appending.
	//foStream.init(file, 0x02 | 0x10, 0666, 0);
	foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); 
	
	// if you are sure there will never ever be any non-ascii text in data you can
	// also call foStream.write(data, data.length) directly
	var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
	converter.init(foStream, "UTF-8", 0, 0);
	converter.writeString(passphrase);
	//converter.writeString(key.toSource());
	converter.close(); // this closes foStream
	/*var sourced = JSON.stringify(key);
	var unsourced = JSON.parse(sourced);*/
}

facebookWall.statusCheck = function(tabBody){
	
	nIntervId = setInterval(facebookWall.checkWall, 5000);
	
}

facebookWall.stopStatusCheck = function(){
	//window.alert("stop checking wall");
	clearInterval(nIntervId);
	
}

facebookWall.checkWall = function(){
	//window.alert("checking wall");
	var tabBody = gBrowser.contentDocument.getElementById("facebook");
	if(tabBody != undefined){
		if(prefManager.getBoolPref("extensions.facebookWall.decrypt")){
			var homeStream = jQuery(tabBody).find('#home_stream');
			
			jQuery(tabBody).find('span.userContent').each(function(index){
				var encrypted = jQuery(this).text();
				
				var decryptionResult = cryptico.decrypt(encrypted, RSAkey);
				
				if(decryptionResult.status != "failure"){
					jQuery(this).fadeOut("slow", function() {
						jQuery(this).text(decryptionResult.plaintext);
						jQuery(this).css("display", "inline");
					});
				}else{
					var decrypted = CryptoJS.AES.decrypt(encrypted, "Secret Passphrase").toString(CryptoJS.enc.Utf8);
					if(decrypted != ""){
						jQuery(this).fadeOut("slow", function() {
							jQuery(this).text(decrypted);
							jQuery(this).css("display", "inline");
						});
					}
				}
				
			});
		}
	}
}

facebookWall.startHttpObserver = function(){
	observer = new facebookWall.HttpRequestObserver();
	observer.start();
}

facebookWall.stopHttpObserver = function(){
	if(observer != null){
		observer.stop();
		delete observer;
		observer = null;
	}
}

facebookWall.HttpRequestObserver = function(){}

facebookWall.HttpRequestObserver.prototype = {
	
	start: function(){
		this.requests = new Array();
		//this.removeFromListener();
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
		/*else if (topic == 'http-on-examine-response'){
			subject.QueryInterface(Components.interfaces.nsIHttpChannel);
			this.onExamineResponse(subject);
		}*/
	},
	
	onExamineResponse: function(oHttp){
		
		var uri = oHttp.URI.asciiSpec;
		
		if (uri.match('^https://www.facebook.com/ajax/updatestatus.php') ||
			uri.match('^http://www.facebook.com/ajax/updatestatus.php')) {
			
			Components.utils.reportError("Request response received: " + uri);
			
			if(prefManager.getBoolPref("extensions.facebookWall.decrypt")){
				Components.utils.reportError("Decryption enabled");
				
				var visitor = new facebookWall.HeaderInfoVisitor(oHttp);
				var request = visitor.visitRequest();
				
				var newListener = new facebookWall.TracingListener();
				oHttp.QueryInterface(Components.interfaces.nsITraceableChannel);
				newListener.originalListener = oHttp.setNewListener(newListener);
				
			}else{
				Components.utils.reportError("Not Decrypting");
			}
			
		}
		
	},
	
	onModifyRequest: function(oHttp){
		
		var uri = oHttp.URI.asciiSpec;
		
		if (uri.match('^https://www.facebook.com/ajax/updatestatus.php') ||
			uri.match('^http://www.facebook.com/ajax/updatestatus.php')) {
			
			Components.utils.reportError("Request being sent: " + uri);
			
			if(prefManager.getBoolPref("extensions.facebookWall.encrypt")){
				Components.utils.reportError("Encryption enabled");
				
				var visitor = new facebookWall.HeaderInfoVisitor(oHttp);
				var requestHeaders = visitor.visitRequest();
				var postData = visitor.getPostData();
				
				var postArray = facebookWall.URLToArray(postData.body);
				
				var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
										.getService(Components.interfaces.nsIPromptService);
				var check = {value: false};
				var input = {value: ""};
				var result = prompts.prompt(null, "Recepient", "Please enter the id of the recepient, left empty it will be encrypted but visible to all users of this extension", input, null, check);
				
				if(input.value == ""){
					var encrypted = CryptoJS.AES.encrypt(postArray["xhpc_message"], "Secret Passphrase");
					
					postArray["xhpc_message"] = encrypted.toString();
					postArray["xhpc_message_text"] = encrypted.toString();
					
					postData = facebookWall.ArrayToURL(postArray);
					
					this.changePostValues(oHttp, postData);
					
				}else{
					
					this.encryptText(postArray["xhpc_message"], input.value, postArray, oHttp);
					
				}
				
			}else{
				Components.utils.reportError("Not Encrypting");
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
		//observerService.addObserver(this, "http-on-examine-response", false);
	},
	
	removeFromListener: function(){
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
		.getService(Components.interfaces.nsIObserverService);
		
		//observerService.removeObserver(this, "http-on-examine-response");
		observerService.removeObserver(this, "http-on-modify-request");
	},
	
	encryptText: function(text, recepient, postArray, oHttp){
		
		var json_str = '"type": "requestKey", "id": "' + recepient + '", "pubKey": "YsTarIHJy9TZBlx0tIc3EqeenMs+8uHxC31SnvmonoHxaMKjvR7FT7gFHj6Op9I9w4X9pVq23RV9kXa1QZli2Q=="';
		//var str = {type: "requestKey", id: recepient, pubKey: "YsTarIHJy9TZBlx0tIc3EqeenMs+8uHxC31SnvmonoHxaMKjvR7FT7gFHj6Op9I9w4X9pVq23RV9kXa1QZli2Q=="};
		//var json_str = JSON.stringify(str);
		//window.alert(json_str);
		
		var request = new XMLHttpRequest();
		request.open("POST", keyServer, false);
		request.setRequestHeader("Content-Type", "application/json");
		request.overrideMimeType("text/plain");
		request.send(json_str);
		if(request.status == 200){
			var obj = jQuery.parseJSON(request.responseText);
			
			if(obj.response != "no such user"){
				var encryptionResult = cryptico.encrypt(text, obj.response);
				postArray["xhpc_message"] = encryptionResult.cipher;
				postArray["xhpc_message_text"] = encryptionResult.cipher;
				
				var postData = facebookWall.ArrayToURL(postArray);
				this.changePostValues(oHttp, postData);
				
			}else{window.alert("User does not exist");}
		}
		/*request.onload = function()
		{
			//window.alert("Response received: " + request.responseText);
			var obj = jQuery.parseJSON(request.responseText);
			
			if(obj.response != "no such user"){
				var encryptionResult = cryptico.encrypt(text, obj.response);
				postArray["xhpc_message"] = encryptionResult.cipher;
				postArray["xhpc_message_text"] = encryptionResult.cipher;
				
				var postData = facebookWall.ArrayToURL(postArray);
				this.changePostValues(oHttp, postData);
				
			}else{window.alert("User does not exist");}
		};*/
		
	},
	
	changePostValues: function(oHttp, postData){
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
			Components.utils.reportError("onModifyRequest:error changing the post values");
			Components.utils.reportError(e);
		}
	},
	
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
		//Components.utils.reportError(data);
		this.receivedData.push(data);
		
		/*binaryOutputStream.writeBytes(data, count);
		
		this.originalListener.onDataAvailable(request, 
											context,
											storageStream.newInputStream(0), 
											offset, 
											count);*/
		
	},
	
	onStopRequest: function(request, context, statusCode){
		
		try {
			var responseSource = this.receivedData.join();
			var prepend = responseSource.substring(0, 9);
			var stripped = responseSource.substring(9);
			Components.utils.reportError(stripped);
			var jsonProcessedData = JSON.parse(stripped);
			var html = jsonProcessedData.jsmods.markup[0][1].__html;
			
			//Firebug.Console.log(html);
			
			var tempDiv = doc.createElement('div');
			tempDiv.innerHTML = html;
			var span = jQuery(tempDiv).find('span.userContent');
			var rawText = jQuery(span).text();
			//Firebug.Console.log(rawText);
			
			var decrypted = CryptoJS.AES.decrypt(rawText, "Secret Passphrase").toString(CryptoJS.enc.Utf8);
			//Firebug.Console.log(decrypted);
			
			if(decrypted != ""){
				span = jQuery(span).text(decrypted);
				var newJsonData = jsonProcessedData;
				newJsonData.jsmods.markup[0][1].__html = tempDiv.innerHTML;
				stripped = JSON.stringify(newJsonData);
				
				var newResponseBody = prepend.concat(stripped);
				
				request.QueryInterface(Components.interfaces.nsIHttpChannel);
				
				var storageStream = this.CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
				storageStream.init(8192, newResponseBody.length, null);
				var binaryOutputStream = this.CCIN("@mozilla.org/binaryoutputstream;1","nsIBinaryOutputStream");
				binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
				
				binaryOutputStream.writeBytes(newResponseBody, newResponseBody.length);
				
				this.originalListener.onDataAvailable(request, context, storageStream.newInputStream(0),
							0, newResponseBody.length);
			}
			
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
			Components.utils.reportError("Got an exception retrieving the post data: [" + e + "]");
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
		var tabBody = gBrowser.contentDocument.getElementById("facebook");
		//Make sure it's not inside an iframe
		if (!win.frameElement) {
			
			Components.utils.reportError("page loaded");
			if(tabBody != undefined){facebookWall.pageOpened(tabBody);}
			facebookWall.stopHttpObserver();
			facebookWall.startHttpObserver();
			
		}
	}
}

facebookWall.pageUnload = function(event){
	if (event.originalTarget instanceof HTMLDocument) {
		var win = event.originalTarget.defaultView;
		doc = event.originalTarget;
		var tabBody = gBrowser.contentDocument.getElementById("facebook");
		//Make sure it's not inside an iframe
		if (!win.frameElement && tabBody != undefined) {
			//window.alert("page unload");
			facebookWall.stopStatusCheck();
			facebookWall.stopHttpObserver();
		}
	}
}

window.addEventListener("load", function () {
	// Add a callback to be run every time a document loads.
	// note that this includes frames/iframes within the document
	facebookWall.init();
	gBrowser.addEventListener("load", facebookWall.pageLoad, true);
	//gBrowser.addEventListener("unload", facebookWall.pageUnload, false);
}, false);

//window.addEventListener("unload", facebookWall.pageUnload, false);

/*var delay = function(aEvent) { 
	var doc = aEvent.originalTarget; setTimeout(function() { 
		example.run(doc,aEvent); 
	}, 1); 
};
var load = function() { 
	gBrowser.addEventListener("DOMContentLoaded", delay, true); 
};
window.addEventListener("pageshow", load, false);*/