/*
* Adapted from code distributed as part of the LiveHTTPHeaders extension
* for Firefox. The licence block included with LiveHTTPHeaders is retained
* below, which is also applicable to this Javascript code..
*
* Adapted by clearm
*
*/

//  **** BEGIN LICENSE BLOCK ****
//  Copyright(c) 2002-2003 Daniel Savard.
//  Adapted in 2010 by Michael Clear
//
//
//  This program is free software; you can redistribute it and/or modify it under
//  the terms of the GNU General Public License as published by the Free
//  Software Foundation; either version 2 of the License, or (at your option)
//  any later version.
//
//  This program is distributed in the hope that it will be useful, but
//  WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
//  or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
//  more details.
//
//  You should have received a copy of the GNU General Public License along with
//  this program; if not, write to the Free Software Foundation, Inc., 59 Temple
//  Place, Suite 330, Boston, MA 02111-1307 USA
//  **** END LICENSE BLOCK ****



if(!cipherdocs){
	var cipherdocs= {};
}


cipherdocs.oHeaderInfoLive = null;


/*
 *
 *  Init function
 *
 */
cipherdocs.initialize = function() {
	//cipherdocs ties into the LiveHTTPHeaders HeaderInfo object
	cipherdocs.oHeaderInfoLive = new cipherdocs.HeaderInfoLive();
	cipherdocs.addToListener(cipherdocs.oHeaderInfoLive);
}
/*
 *
 * Cleanup(destructor)
 *
 */
cipherdocs.cleanup = function() {
	cipherdocs.removeFromListener(cipherdocs.oHeaderInfoLive)
	cipherdocs.oHeaderInfoLive = null;
}
/*
 *
 * addToListener(obj) - registers the given object with the browser as a
 * request/response listener.
 *
 */
cipherdocs.addToListener = function(obj) {
	// Register new request and response listener
	if ('nsINetModuleMgr' in Components.interfaces) {
		// Should be an old version of Mozilla/Phoenix (before september 15, 2003)
		var netModuleMgr = Components.classes["@mozilla.org/network/net-extern-mod;1"].getService(Components.interfaces.nsINetModuleMgr);
		netModuleMgr.registerModule("@mozilla.org/network/moduleMgr/http/request;1", obj);
		netModuleMgr.registerModule("@mozilla.org/network/moduleMgr/http/response;1", obj)
	} else {
		// Should be a new version of  Mozilla/Phoenix (after september 15, 2003)
		var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                    .getService(Components.interfaces.nsIXULAppInfo);
		var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                               .getService(Components.interfaces.nsIVersionComparator);
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		if(versionChecker.compare(appInfo.version, "18") >= 0
			&& versionChecker.compare(appInfo.version, "19") < 0) {
			Components.utils.reportError("Firefox 18, using http-on-opening-request");
			observerService.addObserver(obj, "http-on-opening-request", false);
		}else{
			Components.utils.reportError("Not Firefox 18, using http-on-modify-request");
			observerService.addObserver(obj, "http-on-modify-request", false);
		}		
		observerService.addObserver(obj, "http-on-examine-response", false);
	}
}

/*
 *
 * removeFromListener(obj) - deregisters the given object with the browser as a
 * request/response listener.
 *
 */
cipherdocs.removeFromListener = function(obj) {
	// Unregistering listener
	if ('nsINetModuleMgr' in Components.interfaces) {
		// Should be an old version of Mozilla/Phoenix (before september 15, 2003)
		var netModuleMgr = Components.classes["@mozilla.org/network/net-extern-mod;1"].getService(Components.interfaces.nsINetModuleMgr);
		netModuleMgr.unregisterModule("@mozilla.org/network/moduleMgr/http/request;1", obj);
		netModuleMgr.unregisterModule("@mozilla.org/network/moduleMgr/http/response;1", obj);
	} else {
		// Should be a new version of  Mozilla/Phoenix (after september 15, 2003)
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		observerService.removeObserver(obj, "http-on-opening-request");
		observerService.removeObserver(obj, "http-on-examine-response");
	}
}
/*
*
*Implement the LiveHTTPHeaders HeaderInfo class
*
*/

/*
*
* Constructor 
*
*/
cipherdocs.HeaderInfoLive = function() {
	this.observers = new Array(); // cipherdocs's Observers
}

cipherdocs.HeaderInfoLive.prototype = {
	outgoingRequests : new Array(),
	// Constants
	// Type
	URL : 1,
	REQUEST : 2,
	POSTDATA : 3,
	RESPONSE : 4,
	REQSPACE : 5,
	RESSPACE : 6,
	SEPARATOR : 7,
	// Style
	FIRST : 100,
	MID   : 200,
	LAST  : 300,
	SINGLE: 400,
	// Strings
	SEPSTRING: "----------------------------------------------------------\r\n",

	//array of document ids to ignore
	exclusionList : [],
	
	/*
	*
	* observe listener- receives observation notifications from Firefox
	*
	*/
	observe: function(aSubject, aTopic, aData) {
		try{
		if (aTopic == 'http-on-opening-request' || aTopic == 'http-on-modify-request') { //request ready to dispatch
            aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
			this.onModifyRequest(aSubject);
		} else if (aTopic == 'http-on-examine-response') {//response ready to be retrieved
			aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
			var uri = aSubject.URI.asciiSpec;
			var id = this.extractIdFromPath(uri);
			if (uri.match('^https://docs.google.com/*') && cipherdocsEnabledGlobal && !isUserLoggedIn) {
				this.checkUserIsRegisteredAndLoggedIn();
			}else if(cipherdocsEnabledGlobal && uri.match('^https://.*\.docs.google.com/.*document/d/.*/bind')){
				if(this.exclusionList.indexOf(id) == -1){ //not in exclusion list
					var visitor = new cipherdocs.HeaderInfoVisitor(aSubject);
					var request = visitor.visitRequest();
					//set up a listener on the bind channel
					var newListener = new cipherdocs.BindTracingListener(uri,request);
					aSubject.QueryInterface(Ci.nsITraceableChannel);
					newListener.originalListener = aSubject.setNewListener(newListener);
				}
			}else if (uri.match('^https://docs.google.com/.*document/d/.*/edit')) {
				Components.utils.reportError("examine edit response");
	
				if(isUserLoggedIn){
					// Check if new document & if users wants to encrypt it 
					var newDocValue = FacadeWrapper.facade.NEW_DOCUMENT;
					var notNewDocValue = FacadeWrapper.facade.NOT_NEW_DOCUMENT;
					var errorNewDocValue = FacadeWrapper.facade.ERROR_NEW_DOCUMENT;
					var returnResult = FacadeWrapper.facade.isNewDocument(uri);
					if(returnResult == newDocValue){
						Components.utils.reportError('new document detected');
						modalSharedStruct = new Object;
						modalSharedStruct.retVal = "";
						window.showModalDialog("chrome://cipherdocs/content/popup.html",modalSharedStruct);
						if(!modalSharedStruct.retVal) {
							var documentID = extractIdFromPath(uri);
							this.exclusionList.push(documentID);
							Components.utils.reportError("new document excluded");
							return;
						}
					}else if(returnResult == errorNewDocValue){
						Components.utils.reportError('unable to determine document status');
						modalSharedStruct = new Object;
						modalSharedStruct.retVal = "";
						window.showModalDialog("chrome://cipherdocs/content/newDocError.html",modalSharedStruct);
						if(modalSharedStruct.retVal == true) {
							Components.utils.reportError("user chose to not proceed");
							return;
						}else{
							Components.utils.reportError("user chose to proceed anyway");
						}
					}
					
					// IsCipherDoc: Get the request headers
					var visitor = new cipherdocs.HeaderInfoVisitor(aSubject);
					var request = visitor.visitRequest();
					if ('Cookie' in request && aSubject.responseStatus == 200) {
						Components.utils.reportError(uri);
						//set up a listener on the incoming response						
						var newListener = new cipherdocs.TracingListener(uri,request);
						aSubject.QueryInterface(Ci.nsITraceableChannel);
						newListener.originalListener = aSubject.setNewListener(newListener);
					}else{
						return; //without the cookie we can't work with the response, and a 302 means an invalid cookie
					}
				}
        	
            }else if (uri.match('^'+FacadeWrapper.baseURI+'/collect')) {
				Components.utils.reportError("examine collect response");
				var visitor = new cipherdocs.HeaderInfoVisitor(aSubject);
				// Get the request headers
				var request = visitor.visitRequest();
		        Components.utils.reportError(uri);
		        //set up a listener on the incoming response
		        var newListener = new cipherdocs.TracingListener(uri,request);
                aSubject.QueryInterface(Ci.nsITraceableChannel);
                newListener.originalListener = aSubject.setNewListener(newListener);

            }
		}
		return;
		}catch(e){
			Components.utils.reportError("general error");
			Components.utils.reportError(e);
		}
	},
	
	
	/*
	*
	* Modify a request before it leaves the browser
	*
	*/
	onModifyRequest : function (oHttp) {
		try{
		var uri = oHttp.URI.asciiSpec;
		//there are a few request types we might want to capture
		//register - after plug-install user needs to register 
		if (uri.match('^'+FacadeWrapper.baseURI+'/(request|register.html)')) {
            Components.utils.reportError("onModifyRequest:register");
			var visitor = new cipherdocs.HeaderInfoVisitor(oHttp);
			// Get the request headers
			var request = visitor.visitRequest();

			// and extract Post Data if present
			var postData = request["POSTDATA"];
			if (postData == null) {
				Components.utils.reportError("ignoring request with no post data");
				return; //probably a malformed request if no post data
			}
			var postBody = postData.getPostBody();
			try {
				var outReq = processRegistrationRequest(uri, "POST", request['Content-Type'], postBody,null);//cookie argument isn't actually needed
			} catch(e) {
				Components.utils.reportError("onModifyRequest:error processing registration request");
				Components.utils.reportError(e);
			}
			var postBodyJava = outReq; //this should be the modified request with CSRs
			postBody = postBodyJava; //clunky LiveConnect conversion
			
			var tmp = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);
			if ("data" in tmp) { //the API has version differences- this will determine which version we're using
				// Gecko 1.9 or newer
				tmp.data = postBody;
			}else {
				// 1.8 or older
				tmp.setData(postBody, postBody.length);
			} 
			try {
				// Must change HttpChannel to UploadChannel to be able to access post data
				oHttp.QueryInterface(Components.interfaces.nsIUploadChannel);
				oHttp.setUploadStream(tmp, request['Content-Type'], -1);//replace default stream with modified "tmp"
				oHttp.requestMethod = "POST";
				oHttp.QueryInterface(Components.interfaces.nsIHttpChannel);
			} catch(e) {
				Components.utils.reportError("onModifyRequest:error setting request upload stream for register");
				Components.utils.reportError(e);
			}
			Components.utils.reportError("register stream changed, ending method");
			return;
			
        }
		//mutate- when a change is made to the document
		else if (cipherdocsEnabledGlobal && uri.match('^https://docs.google.com/.*document/d/.*/save')) {
			var id = this.extractIdFromPath(uri);
			if(this.exclusionList.indexOf(id) > -1) return; //return if id in exclusion list
			Components.utils.reportError("onModifyRequest:mutate");
			var visitor = new cipherdocs.HeaderInfoVisitor(oHttp);
			// Get the request headers
			var request = visitor.visitRequest();

			// and extract Post Data if present
			var postData = request["POSTDATA"];
			if (postData == null) {
				return; //probably a malformed request if no post data
			}
			var postBody = postData.getPostBody();
			try {
				var outReq = processRequest(uri, "POST", request['Content-Type'], postBody,null);//cookie argument isn't actually needed
			} catch(e) {
				Components.utils.reportError("onModifyRequest:error processing request");
				Components.utils.reportError(e);
			}
			var postBodyJava = outReq; //this should be the ciphered request to be forwarded
			var result = postBodyJava;
			Components.utils.reportError("####"+result+"####");
			if(!result.length || result == "" ){
				Components.utils.reportError("null value");
				postBody = postBody;
			}else{
				postBody = postBodyJava; //clunky LiveConnect conversion
			}
			
			var tmp = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);
			if ("data" in tmp) { //the API has version differences- this will determine which version we're using
				// Gecko 1.9 or newer
				tmp.data = postBody;
			}else {
				// 1.8 or older
				tmp.setData(postBody, postBody.length);
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
			Components.utils.reportError("mutate stream changed!");	
		}
		//document sharing request issued by user 						
		else if (uri.match('^https://docs.google.com/.*commonshare?')) {
			Components.utils.reportError("onModifyRequest:share");
			var visitor = new cipherdocs.HeaderInfoVisitor(oHttp);
			// Get the request headers
			var request = visitor.visitRequest();

			// and extract Post Data if present
			var postData = request["POSTDATA"];
			if (postData == null) {
				return; //probably a malformed request if no post data
			}
			var postBody = postData.getPostBody();
			try {
				var response = processSharingRequest(uri, postBody);
				if(response != "IGNORE"){
					displayNotificationBox(response);
				}
			} catch(e) {
				Components.utils.reportError("onModifyRequest:error processing sharing request");
				Components.utils.reportError(e);
			}
		}
		//leave request- when the browser navigates away from a document
		else if(uri.match('https://docs.google.com/document/d/.+/leave')){
			notifyDocumentClose(uri);
		}
		//revert command- reverts a document to an earlier revision number
		else if(uri.match('^https://docs.google.com/.*document/d/.*/revert')){
			var visitor = new cipherdocs.HeaderInfoVisitor(oHttp);
			var request = visitor.visitRequest();
			//extract post data if present
			var postData = request["POSTDATA"];
			if (postData == null) {
				return; //probably a malformed request if no post data
			}
			var postBody = postData.getPostBody();
			notifyRevisionRevert(uri,postBody);
		}
		
		}catch(e){
			Components.utils.reportError("onModifyRequest:general error");
			Components.utils.reportError(e);
		}
		return;
	},
	
	QueryInterface: function(iid) {
		if (!iid.equals(Components.interfaces.nsISupports) &&
		!iid.equals(Components.interfaces.nsIHttpNotify) &&
		//!iid.equals(Components.interfaces.nsIClassInfo) &&
		//!iid.equals(Components.interfaces.nsISecurityCheckedComponent) &&
		//!iid.equals(Components.interfaces.nsIWeakReference) &&
		!iid.equals(Components.interfaces.nsIHttpNotify) &&
		!iid.equals(Components.interfaces.nsIObserver)) {
			//dump("cipherdocs: QI unknown iid: " + iid + "\n");
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
		return this;
	},
	
	extractIdFromPath : function(uri){
		var parts = uri.split("/");
		for(var i = 0; i< parts.length;i++){
			if(parts[i] == "d"){
				return parts[i+1];
			}
		}
	},
	
	checkUserIsRegisteredAndLoggedIn: function(){
		//start by checking the security policy
		var cryptoStrength = FacadeWrapper.facade.checkCryptoStrength();
		Components.utils.reportError("cryptoStrength = "+cryptoStrength);
		if(cryptoStrength == FacadeWrapper.facade.POLICY_CHANGED){
			//prompt for restart and don't enable CipherDocs
			window.showModalDialog("chrome://cipherdocs/content/restartNeeded.html");
			cipherdocsEnabledGlobal=false;
			return;
		}
		if(cryptoStrength == FacadeWrapper.facade.LIMITED_STRENGTH_SECURITY){
			JVMInfo = JSON.parse(FacadeWrapper.facade.getJVMInfo());
			Components.utils.reportError(JVMInfo);
			Components.utils.reportError(FacadeWrapper.facade.getJVMInfo());
			window.showModalDialog("chrome://cipherdocs/content/cryptoStrength.html",JVMInfo);
			cipherdocsEnabledGlobal=false;
			return;
		}	
	
		if(FacadeWrapper.facade.isUserRegistered()){
			//user is registered, we know who the user is thanks to a db file
			if(FacadeWrapper.facade.localKeyChainExists()){
				//registered and a local keychain- prompt for password and unlock
				modalSharedStruct = new Object;
				modalSharedStruct.loginFailed=false;
				while(!isUserLoggedIn){
					Components.utils.reportError("user is not logged in - local keychain needs to be unlocked");	
					modalSharedStruct.retVal = "";
					window.showModalDialog("chrome://cipherdocs/content/login.html",modalSharedStruct);
					password = (modalSharedStruct.retVal) || "";
					if(!password || password=="") {
						cipherdocsEnabledGlobal=false;
						Components.utils.reportError("user canceled login");
						break;
					}else {
						Components.utils.reportError("user initiated login");		
						if(FacadeWrapper.facade.unlockKeyChain(password)) {
							Components.utils.reportError("login successful");
							isUserLoggedIn = true;
						}else {
							Components.utils.reportError("login unsuccessful");
							modalSharedStruct.loginFailed=true;
						}
					}
				}
			}else{
				//user is registered but no keychain file exists- try to sync it
				modalSharedStruct = new Object;
				modalSharedStruct.loginFailed=false;
				while(!isUserLoggedIn){
					Components.utils.reportError("user is not logged in - no local keychain");		
					modalSharedStruct.retVal = "";
					window.showModalDialog("chrome://cipherdocs/content/login.html",modalSharedStruct);
					password = (modalSharedStruct.retVal) || "";
					if(password=="") {
						cipherdocsEnabledGlobal=false;
						Components.utils.reportError("user canceled login");
						break;
					}else {
						Components.utils.reportError("user initiated login");		
						if(FacadeWrapper.facade.syncKeyChainRemotely(password)) {
							Components.utils.reportError("login successful");
							isUserLoggedIn = true;
						}else {
							Components.utils.reportError("login unsuccessful");
							modalSharedStruct.loginFailed=true;
						}
					}
				}
			}
		}else{
			Components.utils.reportError("user is not registered");
			unregisteredUserHasBeenReminded = true;
			cipherdocsEnabledGlobal = false;
			while(true){
				modalSharedStruct = {};
				modalSharedStruct.retVal = {};
				window.showModalDialog("chrome://cipherdocs/content/signInSignUp.html", modalSharedStruct);
				if(modalSharedStruct.retVal.proxySettings){
					userSettings = modalSharedStruct.retVal.proxySettings;
					saveUserSettings(userSettings);
				}
				//before letting someone sign up, check if they have proxy properly set
				if(modalSharedStruct.retVal.signUpProceed){
					if(modalSharedStruct.retVal.signUpProceed == "true"){
						window.gBrowser.selectedTab = window.gBrowser.addTab(FacadeWrapper.baseURI+'/register.html');
					}else{
						window.showModalDialog("chrome://cipherdocs/content/checkNetworkError.html");
						this.checkUserIsRegisteredAndLoggedIn();
						return;
					}
				}
				var email = modalSharedStruct.retVal.signIn.email || undefined;
				var password = modalSharedStruct.retVal.signIn.password || undefined;
				if(email && password){ //user is trying to log in to existing account
					var successValue = FacadeWrapper.facade.SYNC_SUCCESS;
					var notRegisteredValue = FacadeWrapper.facade.SYNC_ERROR_NOT_REGISTERED;
					var wrongPasswordValue = FacadeWrapper.facade.SYNC_ERROR_WRONG_PASSWORD;
					var networkErrorValue = FacadeWrapper.facade.SYNC_ERROR_NETWORK;
					Components.utils.reportError("attempting sync..");
					var syncResult = modalSharedStruct.retVal.signIn.firstSyncResult;
					if(syncResult == networkErrorValue){
						window.showModalDialog("chrome://cipherdocs/content/networkError.html");
						continue;
					}
					while(syncResult != successValue){
						//sync failed, check reason and take action
						if(syncResult == notRegisteredValue){
							window.showModalDialog("chrome://cipherdocs/content/notRegistered.html");
							return;
						}						
						if(syncResult == wrongPasswordValue){
							modalSharedStruct.loginFailed=true;
							modalSharedStruct.retVal = "";
							window.showModalDialog("chrome://cipherdocs/content/login.html",modalSharedStruct);
							password = modalSharedStruct.retVal;
							if(password == "") {
								cipherdocsEnabledGlobal=false;
								Components.utils.reportError("user canceled login");
								return;
							}else{
								syncResult = FacadeWrapper.facade.attemptSync(email,password);
								continue;
							}
						}
					}
					isUserLoggedIn = true;
					cipherdocsEnabledGlobal = true;
					return; //no need to prompt for a login, since the chain has been opened
				}
			}			
		}
	}
	
	
	
	
}//end HeaderLiveInfo

cipherdocs.Request = function Request(uri, method, headers, postdata) {
	this.uri = uri;
	this.method = method;
	this.headers = headers;
	this.postdata = postdata;
}

cipherdocs.TracingListener = function TracingListener(_uri, _request ) {
	this.uri = _uri; this.request = _request;
}

cipherdocs.TracingListener.prototype = {
	uri: null,
	request: null,
	originalListener: null,
	receivedData: null,   // array for incoming data
	buffer: null,
	
	onStartRequest: function(request, context) {
		this.receivedData = ""; 
		this.buffer = [];
		this.originalListener.onStartRequest(request, context);
	},
	//called each time a part of a response is received. Just buffer it up until we have it all
	//, then modify later before passing it to other listeners
	onDataAvailable: function(request, context, inputStream, offset, count) {
		var binaryInputStream = this.CCIN("@mozilla.org/binaryinputstream;1",
                                 "nsIBinaryInputStream");
        binaryInputStream.setInputStream(inputStream);

       // Copy received data as they come.
        var data = binaryInputStream.readBytes(count);
        this.receivedData = this.receivedData.concat(data);
	},
	
	//when a response has fully arrved, modify it and then pass it on
	onStopRequest: function(request, context, statusCode) {
		Components.utils.reportError("processing "+this.uri);
		Components.utils.reportError("status code  "+statusCode);

        var message = null;
        var newResponse = null;		
        var processedData = this.receivedData;

        if (this.uri.match('^https://docs.google.com/.*document/d/.*/edit')) {
            message = "This document has been decrypted by CipherDocs.";
            Components.utils.reportError("processing edit "+this.uri);
            newResponse = processResponse(this.uri, this.receivedData, this.request['Cookie']);
        }else if(this.uri.match('^'+FacadeWrapper.baseURI+'/collect')) {
            message = "Your CipherDocs registration has been successful!";
            Components.utils.reportError("processing collect "+this.uri);
            newResponse = processCollectResponse(this.uri, this.receivedData);
        }else {
            Components.utils.reportError("processing unknown uri "+this.uri);
            return;
        }

        var success = getLastOperationSuccess();
		
        Components.utils.reportError("got new response");

        try{
            var jsonProcessedData = JSON.parse(newResponse);//parse JSON to byte array

			if(success){
				displayNotificationBox(message);
				isUserLoggedIn = true;
				cipherdocsEnabledGlobal=true;
			}//else we just got back what we gave in to the core
			
            processedData = jsonProcessedData.responseBody;
			Components.utils.reportError(processedData);
			
			var storageStream = this.CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
			storageStream.init(8192, processedData.length, null);
			var binaryOutputStream = this.CCIN("@mozilla.org/binaryoutputstream;1","nsIBinaryOutputStream");
			binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
			
			binaryOutputStream.writeByteArray(processedData, processedData.length);
			
			//now pass back to the other listeners we have been holding up
			this.originalListener.onDataAvailable(request, context,	storageStream.newInputStream(0),
			 			0, processedData.length);
		
			this.originalListener.onStopRequest(request, context, statusCode);
		
        }catch(e){
			Components.utils.reportError(e);
		}
	},
	
	QueryInterface: function (aIID) {
		if (aIID.equals(Components.interfaces.nsIStreamListener) ||
		aIID.equals(Components.interfaces.nsISupports)) {
			return this;
		}
		throw Components.results.NS_NOINTERFACE;
	},
	
	CCIN : function(cName, ifaceName) {
		return Components.classes[cName].createInstance(Components.interfaces[ifaceName]);
	}
}//end TracingListener


cipherdocs.BindTracingListener = function BindTracingListener(_uri, _request ) {
	this.uri = _uri; this.request = _request;
}

cipherdocs.BindTracingListener.prototype = {
	uri: null,
	request: null,
	originalListener: null,
	receivedData: null,   // array for incoming data
	buffer: null,
	
	onStartRequest: function(request, context) {
		Components.utils.reportError("new listener");
		this.receivedData = ""; 
		this.originalListener.onStartRequest(request, context);
	},
	//called each time a part of a response is received. Just buffer it up until we have it all
	//, then modify later before passing it to other listeners
	onDataAvailable: function(request, context, inputStream, offset, count) {
		Components.utils.reportError("data available!");
		var sis = this.CCIN("@mozilla.org/scriptableinputstream;1",Components.interfaces.nsIScriptableInputStream);
		sis.init(inputStream);
		var plainData = sis.read(count);
		
		var converter = this.CCIN("@mozilla.org/intl/scriptableunicodeconverter",Components.interfaces.nsIScriptableUnicodeConverter)
		converter.charset = "UTF-8"; 
		var line = converter.ConvertToUnicode(plainData); //encode into a UTF-8 string for transport to the core
		
		var newData = line;
		Components.utils.reportError("checking with jar..");
		
		if(!(FacadeWrapper.facade.validateChunk)){
			Components.utils.reportError("ERROR\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nERROR\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nERROR");
			//delay
		}
		try{
			var chunkOK = FacadeWrapper.facade.validateChunk(this.uri,line);
		}catch(e){
			//delay
			//try again
		}
		Components.utils.reportError("got jar result");
		if(!chunkOK){
			Components.utils.reportError("need to buffer up more data for bind, have "+line);
			return; //let the jar buffer up the binds
		}else{
			Components.utils.reportError("enough data given, gave "+line);
			newData = FacadeWrapper.facade.processBindRequest(this.uri);
			var jsonProcessedData = JSON.parse(newData);//parse JSON to byte array
			var processedData = jsonProcessedData.responseBody;
			
			var storageStream = this.CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
			storageStream.init(8192, processedData.length, null);
			var binaryOutputStream = this.CCIN("@mozilla.org/binaryoutputstream;1","nsIBinaryOutputStream");
			binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
			Components.utils.reportError("writing array..");
			binaryOutputStream.writeByteArray(processedData, processedData.length);
		Components.utils.reportError("written!");
			this.originalListener.onDataAvailable(request, context,
				storageStream.newInputStream(0), offset, processedData.length);
				
		}
		
	},
	
	//when a response has fully arrved, modify it and then pass it on
	onStopRequest: function(request, context, statusCode) {
		Components.utils.reportError("terminate bind request, close listener");
		this.originalListener.onStopRequest(request, context, statusCode);
	},
	
	QueryInterface: function (aIID) {
		if (aIID.equals(Components.interfaces.nsIStreamListener) ||
		aIID.equals(Components.interfaces.nsISupports)) {
			return this;
		}
		throw Components.results.NS_NOINTERFACE;
	},
	
	CCIN : function(cName, ifaceName) {
		return Components.classes[cName].createInstance(Components.interfaces[ifaceName]);
	}
}





cipherdocs.HeaderInfoVisitor = function(oHttp) {
	this.oHttp = oHttp;
	this.headers = new Array();
	this.httpHeaders = new Array();
}
cipherdocs.HeaderInfoVisitor.prototype = {
	oHttp : null,
	headers : null,
	getHttpResponseVersion: function () {
		var version = "1.z"; // Default value
		// Check if this is Mozilla v1.5a and more
		try {
			var maj = new Object();
			var min = new Object();
			this.oHttp.QueryInterface(Components.interfaces.nsIHttpChannelInternal);
			this.oHttp.getResponseVersion(maj,min);
			version = "" + maj.value + "."+ min.value;
		} catch (ex) {
		}
		return version;
	},
	getHttpRequestVersion: function (httpProxy) {
		var version = "1.0"; // Default value for direct HTTP and proxy HTTP
		try {
			// This code is based on netwerk/protocol/http/src/nsHttpHandler.cpp (PrefsChanged)
			var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
			pref = pref.getBranch("");
			// Now, get the value of the HTTP version fields
			if (httpProxy) {
				var tmp = pref.getCharPref("network.http.proxy.version");
				if (tmp == "1.1")
					version = tmp;
			} else {
				var tmp = pref.getCharPref("network.http.version");
				if (tmp == "1.1" || tmp == "0.9")
					version = tmp;
			}
		} catch (ex) {
		}
		return version;
	},
	useHttpProxy : function (uri) {
		// This code is based on netwerk/base/src/nsProtocolProxyService.cpp (ExamineForProxy)
		try {
			var pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"].getService().QueryInterface(Components.interfaces.nsIProtocolProxyService);

			// If a proxy is used for this url, we need to keep the host part
			if (typeof(pps.proxyEnabled) != "undefined") {
				// Mozilla up to 1.7
				if (pps.proxyEnabled && (pps.examineForProxy(uri)!=null)) {
					// Proxies are enabled.  Now, check if it is an HTTP proxy.
					return this.isHttpProxy();
				}
			} else {
				// Firefox and Mozilla 1.8+
				if (pps.resolve(uri, pps.RESOLVE_NON_BLOCKING)!=null) {
					// Proxies are enabled.  Now, check if it is an HTTP proxy.
					return this.isHttpProxy();
				}
			}
			return false; // No proxy or not HTTP Proxy
		} catch (ex) {
			return null; // Error
		}
	},
	isHttpProxy : function() {
		// Check if an HTTP proxy is configured.
		var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		pref = pref.getBranch("");
		// Now, get the value of the HTTP proxy fields
		var http_host = pref.getCharPref("network.proxy.http");
		var http_port = pref.getIntPref("network.proxy.http_port");
		// network.proxy.http_port network.proxy.http
		if (http_host && http_port>0) {
			return true; // HTTP Proxy
		}
		return false;
	},
	getPostData : function(oHttp) {
		function postData(stream) {
			// Scriptable Stream Constants
			const JS_SCRIPTABLEINPUTSTREAM_CID = "@mozilla.org/scriptableinputstream;1";
			const JS_SCRIPTABLEINPUTSTREAM     = "nsIScriptableInputStream";
			const JS_ScriptableInputStream = new Components.Constructor
			( JS_SCRIPTABLEINPUTSTREAM_CID, JS_SCRIPTABLEINPUTSTREAM );
			// Create a scriptable stream
			this.seekablestream = stream;
			this.stream = new JS_ScriptableInputStream();
			this.stream.init(this.seekablestream);
			this.mode = this.FAST;

			// Check if the stream has headers
			try {
				this.seekablestream.QueryInterface(Components.interfaces.nsIMIMEInputStream);
				this.hasheaders = true;
				this.body = -1; // Must read header to find body
			} catch (ex) {
				this.hasheaders = false;
				this.body = 0;  // Body at the start of the stream
			}
		}

		postData.prototype = {
			NONE: 0,
			FAST: 1,
			SLOW: 2,
			rewind: function() {
				this.seekablestream.seek(0,0);
			},
			tell: function() {
				return this.seekablestream.tell();
			},
			readLine: function() {
				var line = "";
				var size = 0;
				try {
					size = this.stream.available();
				} catch (ex) {
					size = 0;
				}
				for (var i=0; i<size; i++) {
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
			setMode: function(mode) {
				if (mode < this.NONE && mode > this.SLOW) {
					throw "postData: unsupported mode: " + this.mode;
				}
				this.mode = mode;
			},
			visitPostHeaders: function(visitor) {
				this.rewind();
				if (!this.hasheaders) {
					return;
				}
				var line = this.readLine();
				while(line) {
					if (visitor) {
						var tmp = line.split(/:\s?/);
						visitor.visitHeader(tmp[0],tmp[1]);
					}
					line = this.readLine();
				}
				body = this.tell();
			},
			getPostBody: function(max) {
				// Position the stream to the start of the body
				if (this.body < 0 || this.seekablestream.tell() != this.body) {
					this.visitPostHeaders(null);
				}

				var size = 0;
				try {
					size = this.stream.available();
				} catch(ex) {
					size = 0;
				}
				if (max && max >= 0 && max<size)
					size = max;

				var postString = "";
				try {
					switch (this.mode) {
						case this.NONE:
							//Don't get any content
							break;
						case this.FAST:
							//Get the content in one shot
							if (size>0) {
								postString = this.stream.read(size);
							}
							break;
						case this.SLOW:
							//Must read octet by octet because of a bug in nsIMultiplexStream.cpp
							//This is to avoid 'NS_BASE_STREAM_CLOSED' exception that may occurs
							//See bug #188328.
							for (var i=0; i<size; i++) {
								var c=this.stream.read(1);
								c ? postString+=c : postString+='\0';
							}
							break;
					}
				} catch (ex) {
					//dump("Exception while getting POST CONTENT with mode "+this.mode+": "+ex+"\n");

					return ""+ex;
				} finally {
					// Need to close the stream after use.
					//this.seekablestream.close();
					//this.stream.close();
					//this.seekablestream.seek(2,0);
					this.rewind();
					//this.seekablestream.close();
					//try { this.stream.read(this.stream.available()); } catch (ex) {}
				}
				return postString;
			}
		}

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
			//dump("POSTDATAEXCEPTION:"+e+"\n");
		}
		return null;
	},
	visitHeader : function (name, value) {
		this.headers[name] = value;
		this.httpHeaders[name] = value;
	},
	visitRequest : function () {
		this.headers = new Array();
		var uri, note, ver;
		try {

			// Get the URL and get parts
			// Should I use  this.oHttp.URI.prePath and this.oHttp.URI.path to make
			// the URL ?  I still need to remove the '#' sign if present in 'path'
			var url = String(this.oHttp.URI.asciiSpec);

			// If an http proxy is used for this url, we need to keep the host part
			if (this.useHttpProxy(this.oHttp.URI)==true) {
				uri = url.match(/^(.*?\/\/[^\/]+\/[^#]*)/)[1];
				ver = this.getHttpRequestVersion(true);
			} else {
				uri = url.match(/^.*?\/\/[^\/]+(\/[^#]*)/)[1];
				ver = this.getHttpRequestVersion(false);
			}
		} catch (ex) {
			//dump("PPS: cas5: " + ex + "\n");
			uri = String(this.oHttp.URI.asciiSpec);
			note = "Unsure about the precedent REQUEST uri";
		}
		this.headers["REQUEST"] = this.oHttp.requestMethod + " "
		+ uri + " HTTP/" + ver;
		if (note)
			this.headers["NOTE"] = note;
		this.oHttp.visitRequestHeaders(this);

		// There may be post data in the request
		var postData = this.getPostData(this.oHttp);
		if (postData) {
			postData.visitPostHeaders(this);
			this.visitHeader("POSTDATA",postData);
		} else {
			this.visitHeader("POSTDATA",null);
		}

		return this.headers;
	},
	visitResponse : function () {
		var ver = this.getHttpResponseVersion();
		this.headers = new Array();
		this.headers["RESPONSE"] = "HTTP/" + ver + " " + this.oHttp.responseStatus
		+ " " + this.oHttp.responseStatusText;
		//this.headers["loadGroup"] = this.oHttp.loadGroup
		//this.headers["owner"] = this.oHttp.owner
		//this.headers["notificationCallbacks"] = this.oHttp.notificationCallbacks
		//if (this.oHttp.loadGroup) this.headers["loadGroup.ncb"] = this.oHttp.loadGroup.notificationCallbacks
		this.oHttp.visitResponseHeaders(this);
		return this.headers;
	}
}//end HeaderInfoVisitor
