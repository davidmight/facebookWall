var FacadeWrapper = {}


function setUpCipherDocs(){
try{
	/*
	* Load preferences for the extension
	*/
	//path preferences
	var systemPath = Application.prefs.get("extensions.cipherdocs.CipherdocsSystemPath").value;
	var debugPath = Application.prefs.get("extensions.cipherdocs.CipherdocsDebugPath").value;
	var separator = ((systemPath.search(/\\/) != -1) ? "\\" : "/"); //determine OS path seperator quickly
	
	//TODO: move this list to larger keystore/app data entity 
	exclusionListArray = null;
	FacadeWrapper.exclusionList = Application.prefs.get("extensions.cipherdocs.ExclusionList");
	if(FacadeWrapper.exclusionList){
		Components.utils.reportError("xl: " + FacadeWrapper.exclusionList.value);
	}

	/*
	* Perform java class loading on the jar
	*/
	//displayNotificationBox("opening file: file:"+systemPath+separator+"cipherdocs.jar");
	FacadeWrapper.systemPath = getFileURIFromChromeURI(systemPath);
	FacadeWrapper.debugPath = getFileURIFromChromeURI(debugPath);
	
	var urls = toJavaUrlArray(FacadeWrapper.systemPath+"cipherdocs.jar"); 
	var loader = java.net.URLClassLoader.newInstance(urls);
	
	//Set security policies
	policyAdd(loader, urls);
	//reload the jar with the new policy in effect
	loader = java.net.URLClassLoader.newInstance(urls);
	
	
	 /*
	* Initialise the core
	*/
	const FacadeClass = java.lang.Class.forName("com.impartio.cipherdocs.PluginFacade", true, loader);
	FacadeWrapper.facade = FacadeClass.newInstance(); //var facade is the handle to the core
	FacadeWrapper.facade.init(window.navigator.userAgent, FacadeWrapper.debugPath+"cipherdocs.log");
	if(FacadeWrapper.facade == null){
		displayNotificationBox("CipherDocs experienced an error setting up and has not been enabled (do you have the Java browser plugin installed?)");
		cipherdocsEnabledGlobal=false;
	}else{
		Components.utils.reportError("init");
		cipherDocsNeedsSettings = FacadeWrapper.facade.settingsNeeded();
		FacadeWrapper.baseURI = FacadeWrapper.facade.getBaseServerURI();
		cipherdocsEnabledGlobal = true;
	}
}catch (e){
	Components.utils.reportError(e);
}

}

/*
* Give permissions to the jar
*/
function policyAdd (loader, urls) {
    try{
        var policyClass = java.lang.Class.forName("com.impartio.cipherdocs.URLSetPolicy", true, loader);
        var policy = policyClass.newInstance();
        policy.setOuterPolicy(java.security.Policy.getPolicy());
        java.security.Policy.setPolicy(policy);
        policy.addPermission(new java.security.AllPermission());
        for (var j=0; j < urls.length; j++) {
            policy.addURL(urls[j]);
        }
    }catch(e) {
		displayNotificationBox("CipherDocs experienced an error setting up and has not been enabled");
		Components.utils.reportError(e);
		
    }
}

/*
* Wrappers around the core
*/

function saveUserSettings(settings) {
    try {
        return FacadeWrapper.facade.saveUserSettings(JSON.stringify(settings)); 
    }
    catch (e) {
		displayNotificationBox("CipherDocs experienced an error saving your settings.");
    	Components.utils.reportError(e);
	return false;
    }
}

function isNewDocument(uri) {
    try {
        return FacadeWrapper.facade.isNewDocument(uri); 
    }
    catch (e) {
		displayNotificationBox("CipherDocs experienced an error processing a request - please reopen (or recreate) this documment.");
    	Components.utils.reportError(e);
	return false;
    }
}

function processRequest(uri, method, contentType, body, cookie) {
    try {
        return FacadeWrapper.facade.processRequest(uri, method, contentType, body, cookie); 
    }
    catch (e) {
		displayNotificationBox("CipherDocs experienced an error processing a request- some text has not been encrypted.");
    	Components.utils.reportError(e);
        return body;
    }
}

function processRegistrationRequest(uri, method, contentType, body, cookie) {
    try {
        return FacadeWrapper.facade.processRegistrationRequest(uri, method, contentType, body, cookie); 
    }
    catch (e) {
		displayNotificationBox("CipherDocs was unable to process your registration.");
    	Components.utils.reportError(e);
        return body;
    }
}

function processCollectResponse(uri, body) {
    try {
        return FacadeWrapper.facade.processCollectResponse(uri, body); 
    }
    catch (e) {
		displayNotificationBox("CipherDocs was unable to process your registration at this time, please try again.");
    	Components.utils.reportError(e);
        return body;
    }
}

function processSharingRequest(uri, body) {
    try {
        return FacadeWrapper.facade.processSharingRequest(uri, body); 
    }
    catch (e) {
    	Components.utils.reportError(e);
        return "CipherDocs was unable to share this document due to an unexpected error.";
    }
}

function processResponse(uri, body, cookie) {
    try {
        return FacadeWrapper.facade.processResponse(uri, body,cookie); 
    }
    catch (e) {
	displayNotificationBox("CipherDocs experienced an error processing a response- text may not have been decrypted.");
    	Components.utils.reportError(e);
        return null; //the caller will properly handle the failure
    }
}

function notifyDocumentClose(uri){
	try{
		FacadeWrapper.facade.notifyDocumentClose(uri)
	}catch(e){
		Components.utils.reportError(e);
	}
}

function notifyRevisionRevert(uri,postBody){
	try{
		FacadeWrapper.facade.notifyRevisionRevert(uri,postBody)
	}catch(e){
		Components.utils.reportError(e);
	}
}

function getLastOperationSuccess(){
	try{
		return FacadeWrapper.facade.getLastOperationSuccess();		
	}catch(e){
		Components.utils.reportError(e);
	}
}


/*
* Converts a javascript array of strings to array of Java.net.URLs
*/
function toJavaUrlArray(url1) {
try{
	var bcProvJarpath = FacadeWrapper.systemPath+"bcprov-146.jar";
	var bcMailJarpath = FacadeWrapper.systemPath+"bcmail-146.jar";
	var dummyUrl = new java.net.URL("http://www.impartio.com");
	var urlArray = java.lang.reflect.Array.newInstance(dummyUrl.getClass(), 3);
	java.lang.reflect.Array.set(urlArray,0,(typeof url1 == "string") ? new java.net.URL(url1) : url1);
	java.lang.reflect.Array.set(urlArray,1, new java.net.URL(bcProvJarpath));
	java.lang.reflect.Array.set(urlArray,2, new java.net.URL(bcMailJarpath));
	return urlArray;
	}catch(e){
		Components.utils.reportError(e)
	}
}

function reportMessage(aMessage) {
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                 .getService(Components.interfaces.nsIConsoleService);
  consoleService.logStringMessage("Cipherdocs: " + aMessage);
}

function displayNotificationBox(message){
	Components.utils.reportError(message);
	var nb = gBrowser.getNotificationBox(); 
	nb.appendNotification(  
		message, "xulschoolhello-friend-notification",  
		"chrome://xulschoolhello/skin/friend-notification.png",  
		nb.PRIORITY_WARNING_MEDIUM, []); //show the top-of-tab warning bar
}

function getFileURIFromChromeURI(url){
	var reg = Components.classes['@mozilla.org/chrome/chrome-registry;1'].getService(Components.interfaces["nsIChromeRegistry"]);
    var uri = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService)
                  .newURI(url, null, null);
    return reg.convertChromeURL(uri).spec;

}

function extractIdFromPath (uri){
	var parts = uri.split("/");
	for(var i = 0; i< parts.length;i++){
		if(parts[i] == "d"){
			return parts[i+1];
		}
	}
}

function promptForSettingsAndSave(){
	var userSettings = null;
	Components.utils.reportError("prompting for settings..");
	modalSharedStruct = new Object;
	modalSharedStruct.retVal = "";
	window.showModalDialog("chrome://cipherdocs/content/settings.html",modalSharedStruct);
	userSettings = modalSharedStruct.retVal;
	saveUserSettings(userSettings)
}