
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

/*HeaderInfoVisitor = function(oHttp){
	this.oHttp = oHttp;
	this.headers = new Array();
	this.httpHeaders = new Array();
}

HeaderInfoVisitor.prototype = {
	
	
	
}*/

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
