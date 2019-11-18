/** 
 *=================WebSocket based Player
 * http://www.runoob.com/tags/ref-av-dom.html video tag play
 */


/** 
 * Interface with h5s websocket player API
 * @constructor
 * @param 
 var pbconf1 = {
	begintime: '2019-03-23T120101+08',//{string} begintime 0 for fileplayback
	endtime: '2019-03-23T150101+08',//{string} endtime 0 for fileplayback
	autoplay: 'true', // 'true' or 'false' for playback autoplay
	showposter: 'true', //'true' or 'false' show poster
	serverpb: 'true', //'true' or 'false' playback from h5stream record, default false 
	filename: 'token1.mp4', // file name need to playback (begintime == 0 & endtime == 0 and serverpb is true)
	callback: PlaybackCB, //{function}(event(string), userdata(object)) 
	userdata:  user data // user data
};
 
 var conf = {
	videoid:'h5sVideo1', //{string} - id of the video element tag
	videodom: h5svideodom1, //{object} - video dom. if there has videoid, just use the videoid
	protocol: window.location.protocol, // {string} - 'http:' or 'https:'
	host: window.location.host, //{string} - 'localhost:8080'
	rootpath:window.location.pathname, // {string} - path of the app running
	token:'token1', // {string} - token of stream
	streamprofile: 'main', // {string} - stream profile, main/sub or other predefine transcoding profile
	pbconf: pbconf1, //This is optional, if no pbconf, this will be live.
	hlsver:'v1', //{string} -  v1 is for ts, v2 is for fmp4 
	session:'c1782caf-b670-42d8-ba90-2244d0b0ee83' //{string} - session got from login
};
*/

function H5sPlayerWS(conf)
{
	
	this.sourceBuffer;
	this.buffer = [];	
	this.mediaSource;
	this.video;
	this.wsSocket;
	this.checkSourceBufferId;
	this.keepaliveTimerId;
	this.emptyBuffCnt = 0;
	this.lastBuffTime = 0;
	this.buffTimeSameCnt = 0;
	this.bNeedReconnect = false;
	this.bDisConnected = false;
	this._bGetCodec = false;
	this._strCodec;
	this._conf = conf;
	console.log("Websocket Conf:", conf);
	
	this._videoId = conf.videoid;
	
	this._pbconf = conf.pbconf;
	
	this._token = conf.token;
	//console.log(conf.token, this._videoId);
	if (this._videoId === undefined)
	{
		this._videodom = conf.videodom;
		console.log(conf.token, "use dom directly");
	}else
	{
		this._videodom = document.getElementById(this._videoId);
		console.log(conf.token, "use videoid");
	}
	
	this.video = this._videodom;

	var strPosterUri;
	//playback don't use poster
	if (this._pbconf != undefined && this._pbconf.showposter == 'false')
	{
	}else 
	{
		strPosterUri = this._conf.protocol + '//' + this._conf.host + this._conf.rootpath +
									'api/v1/GetImage?token=' + this._token + '&session=' + this._conf.session;									
		console.log(conf.token,strPosterUri, "connect src");
		this._videodom.setAttribute('poster',strPosterUri);
	}
	
	
	
}

H5sPlayerWS.prototype.ReconnectFunction = function() 
{
	//console.log('Try Reconnect...', this.bNeedReconnect);
	if (this.bNeedReconnect === true)
	{
		console.log('Reconnect...');
		
		this.setupWebSocket(this._token);
		this.bNeedReconnect = false;
	}
	//console.log('Try Reconnect...', this.bNeedReconnect);
}
	
	
H5sPlayerWS.prototype.H5SWebSocketClient = function(h5spath) 
{
	var socket;
	console.log("H5SWebSocketClient");
	try {
		//alert(this._conf.protocol);
		if (this._conf.protocol == "http:") 
		{
			if (typeof MozWebSocket != "undefined")
			{
				socket = new MozWebSocket('ws://' + this._conf.host  +  h5spath);
			}else
			{
				socket = new WebSocket('ws://' + this._conf.host +  h5spath);
			}
		}
		if (this._conf.protocol == "https:")
		{	
			//alert(this._conf.host);
			console.log(this._conf.host);
			if (typeof MozWebSocket != "undefined")
			{
				socket = new MozWebSocket('wss://' + this._conf.host +  h5spath);
			}else
			{
				socket = new WebSocket('wss://' + this._conf.host + h5spath);
			}				
		}
		console.log(this._conf.host);
	} catch (e) {
		alert('error');
		return;
	}
	return socket;
}
	
	
H5sPlayerWS.prototype.readFromBuffer = function()
{
	if (this.sourceBuffer === null || this.sourceBuffer === undefined)
	{
		console.log(this.sourceBuffer, "is null or undefined");
		return;
	}
	if (this.buffer.length === 0 || this.sourceBuffer.updating) 
	{
	  return;
	}
	try {
	  var data = this.buffer.shift();
	  var dataArray = new Uint8Array(data);
	  this.sourceBuffer.appendBuffer(dataArray);
	} catch (e) {
	  console.log(e);
	}
}
H5sPlayerWS.prototype.keepaliveTimer = function()	
{
	try {
		var j = {};
		j.cmd = "H5_KEEPALIVE";
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerWS.prototype.onWebSocketData = function(msg)	
{
/*
	var blob = msg.data;

	var fileReader = new FileReader();
	fileReader.onload = function () {
		this.buffer.push(this.result);
		readFromBuffer();
	};

	fileReader.readAsArrayBuffer(blob);
	*/
	if(msg.data instanceof ArrayBuffer )
	{
		//console.log("ArrayBuffer");
	}
	
	if(typeof msg.data === 'string')
	{
		console.log("string");
		if (this._pbconf != undefined && this._pbconf.callback != undefined)
		{
			this._pbconf.callback(msg.data, this._pbconf.userdata);
		}
		return;
	}
	
	if (this.bDisConnected === true)
	{
		return;
	}
	if (this._bGetCodec === false)
	{
		this._strCodec = String.fromCharCode.apply(null, new Uint8Array(msg.data));
		//console.log("String Codec", this._strCodec);
		this.setupSourceBuffer(this);
		
		this._bGetCodec = true;
		return;
	}else
	{
		this.buffer.push(msg.data);
		this.readFromBuffer();
	}
} 
	

H5sPlayerWS.prototype.setupSourceBuffer = function(h5sPlayer)	
{
	try {
		window.MediaSource = window.MediaSource || window.WebKitMediaSource;
		if (!window.MediaSource) {
		  console.log('MediaSource API is not available');
		}
		
		var mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
		if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
			console.log('MIME type or codec: ', mimeCodec);
		} else {
			console.log('Unsupported MIME type or codec: ', mimeCodec);
		}

		h5sPlayer.mediaSource = new window.MediaSource();

		h5sPlayer.video.autoplay = true;
		console.log(h5sPlayer._videoId);

		//var h5spath = video.getAttribute('h5spath');
		var h5spath = "api/v1/h5swsapi";
		

		/* var video = document.querySelector('h5sVideo'); */
		//alert(h5spath);
		h5sPlayer.video.src = window.URL.createObjectURL(h5sPlayer.mediaSource);
		h5sPlayer.video.play();

		h5sPlayer.mediaSource.addEventListener('sourceopen', h5sPlayer.mediaSourceOpen.bind(h5sPlayer), false);
	
	}
	catch (e)
	{
		console.log(e);
	}
			
}

H5sPlayerWS.prototype.mediaSourceOpen = function()	
{
	console.log("Add SourceBuffer");

	this.sourceBuffer = this.mediaSource.addSourceBuffer(this._strCodec);
	this.mediaSource.duration = Infinity;
	this.mediaSource.removeEventListener('sourceopen', this.mediaSourceOpen, false);
	this.sourceBuffer.addEventListener('updateend', this.readFromBuffer.bind(this), false);		
}
	
H5sPlayerWS.prototype.setupWebSocket = function(token)	
{
	this.video.autoplay = true;
	
	//var h5spath = this.video.getAttribute('h5spath');
	var h5spath = "api/v1/h5swsapi";
	//var token = this.video.getAttribute('token');
	var streamprofile = 'main';
	if (this._conf.streamprofile === undefined)
	{}else 
	{
		streamprofile = this._conf.streamprofile;
	}
	
	if (this._pbconf === undefined)
	{
		h5spath = this._conf.rootpath + h5spath + "?token=" + token + "&profile=" + streamprofile + '&session=' + this._conf.session;
	}else 
	{
		var serverpb = 'false';
		var filename = 'fake';
		if (this._pbconf.serverpb === undefined)
		{}else 
		{
			serverpb = this._pbconf.serverpb;
		}

		if (this._pbconf.filename === undefined)
		{}else 
		{
			filename = this._pbconf.filename;
		}		
		
		h5spath = this._conf.rootpath + h5spath + "?token=" + token 
								+ "&playback=true"
								+ '&profile=' + streamprofile
								+ "&serverpb=" + serverpb
								+ "&begintime=" + encodeURIComponent(this._pbconf.begintime)//this._pbconf.begintime
								+ "&endtime=" + encodeURIComponent(this._pbconf.endtime)//this._pbconf.endtime
								+ "&filename=" + filename//file name
								+ '&session=' + this._conf.session;
	}				+ '&session=' + this._conf.session;

	
	
	console.log(h5spath);
	
	this.wsSocket = this.H5SWebSocketClient(h5spath);
	console.log("setupWebSocket", this.wsSocket);
	this.wsSocket.binaryType = 'arraybuffer';
	this.wsSocket.h5 = this;
	this.wsSocket.onmessage = this.onWebSocketData.bind(this);
	
	this.wsSocket.onopen = function()
	{
		console.log("wsSocket.onopen", this.h5);
		this.h5.checkSourceBufferId = setInterval(this.h5.CheckSourceBuffer.bind(this.h5), 10000);
		this.h5.keepaliveTimerId = setInterval(this.h5.keepaliveTimer.bind(this.h5), 1000);
		if (this.h5._pbconf != undefined && this.h5._pbconf.autoplay === 'true')
		{
			this.h5.start();
		}
	}
	
	this.wsSocket.onclose = function () {
		console.log("wsSocket.onclose", this.h5);
		if (this.h5.bDisConnected === true)
		{
			console.log("wsSocket.onclose disconnect");
		}else
		{
			this.h5.bNeedReconnect = true;
		}
		
		this.h5.CleanupSourceBuffer(this.h5);
		this.h5.CleanupWebSocket(this.h5);
		this.h5._strCodec = "";
		this.h5._bGetCodec = false;
	}

}
	
H5sPlayerWS.prototype.CleanupSourceBuffer = function(h5sPlayer)
{
	console.log('Cleanup Source Buffer', h5sPlayer);
	
	try {
		h5sPlayer.sourceBuffer.removeEventListener('updateend', h5sPlayer.readFromBuffer, false);
		h5sPlayer.sourceBuffer.abort();


		if (document.documentMode || /Edge/.test(navigator.userAgent)) 
		{
			console.log('IE or EDGE!');
		}else
		{
			h5sPlayer.mediaSource.removeSourceBuffer(h5sPlayer.sourceBuffer);
		}
		//Clear the this.video source
		//this.video.src = '';
		h5sPlayer.sourceBuffer = null;
		h5sPlayer.mediaSource = null;
		h5sPlayer.buffer = [];
	}
	catch (e)
	{
		console.log(e);
	}	
}

H5sPlayerWS.prototype.CleanupWebSocket = function(h5sPlayer)
{
	console.log('CleanupWebSocket', h5sPlayer);
	clearInterval(h5sPlayer.keepaliveTimerId);
	clearInterval(h5sPlayer.checkSourceBufferId);
	h5sPlayer.emptyBuffCnt = 0;
	h5sPlayer.lastBuffTime = 0;
	h5sPlayer.buffTimeSameCnt = 0;
}
	

H5sPlayerWS.prototype.CheckSourceBuffer = function()	
{
	if (this._pbconf === undefined)
	{
		
	}else
	{	
		/* playback don't need check source buffer */
		return;
	}
	
	if (this.bDisConnected === true)
	{
		console.log("CheckSourceBuffer has been disconnect", this);
		clearInterval(this.keepaliveTimerId);
		clearInterval(this.checkSourceBufferId);
		clearInterval(this.reconnectTimerId);
	}
	try {
		console.log("CheckSourceBuffer", this);
		if (this.sourceBuffer.buffered.length <= 0)
		{
			this.emptyBuffCnt ++;
			if (this.emptyBuffCnt > 8)
			{
				console.log("CheckSourceBuffer Close 1");
				this.wsSocket.close();
				return;
			}
		}else
		{
			this.emptyBuffCnt = 0;
			var buffStartTime = this.sourceBuffer.buffered.start(0);
			var buffEndTime = this.sourceBuffer.buffered.end(0);
			
			var buffDiff = buffEndTime - this.video.currentTime;
			if (buffDiff > 5 || buffDiff < 0)
			{
				console.log("CheckSourceBuffer Close 2", buffDiff);
				this.wsSocket.close();
				return;				
			}
			
			if ( buffEndTime == this.lastBuffTime)
			{
				this.buffTimeSameCnt ++;
				if (this.buffTimeSameCnt > 3)
				{
					console.log("CheckSourceBuffer Close 3");
					this.wsSocket.close();
					return;
				}
			}else
			{
				this.buffTimeSameCnt = 0;
			}
			
			this.lastBuffTime = buffEndTime;
			
		}
	
	}
	catch (e)
	{
		console.log(e);
	}	

}

/** 
 * Connect a websocket Stream to videoElement 
*/
H5sPlayerWS.prototype.connect = function() {
	
	
	/* start connect to server */
	this.setupWebSocket(this._token);
	this.reconnectTimerId = setInterval(this.ReconnectFunction.bind(this), 3000);
}


/** 
 * Disconnect a websocket Stream and clear videoElement source
*/
H5sPlayerWS.prototype.disconnect = function() {
	console.log("disconnect", this);
	this.bDisConnected = true;
	clearInterval(this.reconnectTimerId);
	
	if (this.wsSocket != null)
	{
		this.wsSocket.close();
		this.wsSocket = null;
	}
	console.log("disconnect", this);
}

H5sPlayerWS.prototype.start = function(){
	try {
		var j = {};
		j.cmd = "H5_START";
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerWS.prototype.pause = function(){
	try {
		var j = {};
		j.cmd = "H5_PAUSE";
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerWS.prototype.resume = function(){
	try {
		var j = {};
		j.cmd = "H5_RESUME";
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerWS.prototype.seek = function(nTime){
	try {
		var j = {};
		j.cmd = "H5_SEEK";
		j.nSeekTime = nTime;
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerWS.prototype.speed = function(nSpeed){
	try {
		var j = {};
		j.cmd = "H5_SPEED";
		j.nSpeed = nSpeed;
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}


/** 
 *=================WebRTC based Player
 *
 */
/** 
 * Interface with h5s WebRTC player API
 * @constructor
 * @param 
 var conf = {
	videoid:'h5sVideo1', //{string} - id of the video element tag
	videodom: h5svideodom1, //{object} - video dom. if there has videoid, just use the videoid
	protocol: window.location.protocol, // {string} - 'http:' or 'https:'
	host: window.location.host, //{string} - 'localhost:8080'
	rootpath:window.location.pathname, // {string} - path of the app running
	device:'device1', // {string} - token of device
	token:'token1', // {string} - token of stream
	hlsver:'v1', //{string} -  v1 is for ts, v2 is for fmp4 
	session:'c1782caf-b670-42d8-ba90-2244d0b0ee83' //{string} - session got from login
};
*/

function H5sPlayerRTC(conf)
{
	this.wsSocket;
	this.checkSourceBufferId;
	this.keepaliveTimerId;
	this.emptyBuffCnt = 0;
	this.lastBuffTime = 0;
	this.buffTimeSameCnt = 0;
	this.bNeedReconnect = false;
	this.bDisConnected = false;

	this._conf = conf;
	
	this._videoId = conf.videoid;
	
	this._pbconf = conf.pbconf;

	this._token = conf.token;
	//console.log(conf.token, this._videoId);
	if (this._videoId === undefined)
	{
		this._videodom = conf.videodom;
		console.log(conf.token, "use dom directly");
	}else
	{
		this._videodom = document.getElementById(this._videoId);
		console.log(conf.token, "use videoid");
	}
	
	this.video = this._videodom;

	this.pc               = null;    

	this.pcOptions        = { "optional": [{"DtlsSrtpKeyAgreement": true} ] };

	this.mediaConstraints = {
		mandatory: {
			'offerToReceiveAudio': true,
			'offerToReceiveVideo': true
		}
	};
	this.pcConfig         = {"iceServers": [] };
	this.earlyCandidates = [];
	var strPosterUri;

	if (this._pbconf != undefined && this._pbconf.showposter == 'false')
	{
	}else 
	{
		strPosterUri = this._conf.protocol + '//' + this._conf.host + this._conf.rootpath +
									'api/v1/GetImage?token=' + this._token + '&session=' + this._conf.session;
		console.log("connect src", conf.token);
		this._videodom.setAttribute('poster',strPosterUri);
	}

	
	
	
	//if (this._pbconf != undefined && this._pbconf.callback != undefined)
	//{
		//console.log("connect src =============", this._pbconf.callback, this._pbconf.userdata);
	//	this._pbconf.callback('UPDATE_TIME', 'update time 1111', this._pbconf.userdata);
	//}
	
	
}

H5sPlayerRTC.prototype.ReconnectFunction = function() 
{
	//console.log('Try Reconnect...', this.bNeedReconnect);
	if (this.bNeedReconnect === true)
	{
		console.log('Reconnect...');
		
		this.setupWebSocket(this._token);
		this.bNeedReconnect = false;
	}
	//console.log('Try Reconnect...', this.bNeedReconnect);
}
	
	
H5sPlayerRTC.prototype.H5SWebSocketClient = function(h5spath) 
{
	var socket;
	console.log("H5SWebSocketClient");
	try {
		//alert(this._conf.protocol);
		if (this._conf.protocol == "http:") 
		{
			if (typeof MozWebSocket != "undefined")
			{
				socket = new MozWebSocket('ws://' + this._conf.host  +  h5spath);
			}else
			{
				socket = new WebSocket('ws://' + this._conf.host +  h5spath);
			}
		}
		if (this._conf.protocol == "https:")
		{	
			//alert(this._conf.host);
			console.log(this._conf.host);
			if (typeof MozWebSocket != "undefined")
			{
				socket = new MozWebSocket('wss://' + this._conf.host +  h5spath);
			}else
			{
				socket = new WebSocket('wss://' + this._conf.host + h5spath);
			}				
		}
		console.log(this._conf.host);
	} catch (e) {
		alert('error');
		return;
	}
	return socket;
}

H5sPlayerRTC.prototype.keepaliveTimer = function()	
{
	try {
		var j = {};
		j.type = "keepalive";
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

/*
* RTCPeerConnection IceCandidate callback
*/
H5sPlayerRTC.prototype.onIceCandidate = function (event) {
	if (event.candidate) {
		console.log("onIceCandidate currentice", event.candidate);
    	//if (this.pc.currentRemoteDescription)  {
				var currentice;
				currentice = event.candidate;
				console.log("onIceCandidate currentice", currentice, JSON.stringify(currentice));
				var msgremoteice = JSON.parse(JSON.stringify(currentice));
				msgremoteice.type = 'remoteice';
				console.log("onIceCandidate currentice new", msgremoteice, JSON.stringify(msgremoteice));
				this.wsSocket.send(JSON.stringify(msgremoteice));

		//} else {
		//	this.earlyCandidates.push(event.candidate);
		//}
	} 
	else {
		console.log("End of candidates.");
	}
}

/*
* RTCPeerConnection AddTrack callback
*/
H5sPlayerRTC.prototype.onTrack = function(event) {
	console.log("Remote track added:" +  JSON.stringify(event));
        var stream;
	if (event.streams) {
		stream = event.streams[0];
	} 
	else {
		stream = event.stream;
	}
	var videoElement = this._videodom;
	videoElement.src = URL.createObjectURL(stream);
	//videoElement.setAttribute("playsinline", true);
	videoElement.play();
}

/*
* create RTCPeerConnection 
*/
H5sPlayerRTC.prototype.createPeerConnection = function() 
{
	console.log("createPeerConnection  config: " + JSON.stringify(this.pcConfig) + " option:"+  JSON.stringify(this.pcOptions));
	var pc = new RTCPeerConnection(this.pcConfig, this.pcOptions);
	var streamer = this;
	pc.onicecandidate = function(evt) { streamer.onIceCandidate.call(streamer, evt); };
	if (typeof pc.ontrack != "undefined") {
		pc.ontrack        = function(evt) { streamer.onTrack.call(streamer,evt); };
	} 
	else {
		pc.onaddstream    = function(evt) { streamer.onTrack.call(streamer,evt); };
	}
	pc.oniceconnectionstatechange = function(evt) {
		console.log("oniceconnectionstatechange  state: " + pc.iceConnectionState);
		return;
		//var videoElement = streamer._videodom;
		//if (videoElement) {
		//	if (pc.iceConnectionState === "connected") {
		//		videoElement.style.opacity = "1.0";
		//	}			
		//	else if (pc.iceConnectionState === "disconnected") {
		//		//videoElement.style.opacity = "0.25";
		//	}			
		//	else if ( (pc.iceConnectionState === "failed") || (pc.iceConnectionState === "closed") )  {
		//		//videoElement.style.opacity = "0.5";
		//	}		
		//}
	}
	
	console.log("Created RTCPeerConnnection with config: " + JSON.stringify(this.pcConfig) + "option:"+  JSON.stringify(this.pcOptions) );
	return pc;
}

function createRTCSessionDescription(msg) {
    console.log("createRTCSessionDescription ");
    var SessionDescription = new RTCSessionDescription(msg);
    return SessionDescription;
}

H5sPlayerRTC.prototype.ProcessRTCOffer = function(msg)	
{
	console.log("ProcessRTCOffer", msg);
	try {
		this.pc = this.createPeerConnection();
		this.earlyCandidates.length = 0;
		var streamer = this;

		this.pc.setRemoteDescription(createRTCSessionDescription(msg));
		// create answer
		this.pc.createAnswer(this.mediaConstraints).then(function(sessionDescription) {
			console.log("Create answer:" + JSON.stringify(sessionDescription));
			
			streamer.pc.setLocalDescription(sessionDescription
				, function() 
				{ 
					console.log("ProcessRTCOffer createAnswer", sessionDescription);
					streamer.wsSocket.send(JSON.stringify(sessionDescription));
				}
				, function() {} );
			
		}, function(error) { 
			alert("Create awnser error:" + JSON.stringify(error));
		});


	}catch (e) {
		this.disconnect();
		alert("connect error: " + e);
	}	 


} 

H5sPlayerRTC.prototype.ProcessRemoteIce = function(msg)	
{
	console.log("ProcessRemoteIce", msg);

	try {
		var candidate = new RTCIceCandidate({
			sdpMLineIndex: msg.sdpMLineIndex,
			candidate: msg.candidate
		  });
		console.log("ProcessRemoteIce", candidate);
			
		console.log("Adding ICE candidate :" + JSON.stringify(candidate) );
		this.pc.addIceCandidate(candidate
			, function()      { console.log ("addIceCandidate OK"); }
			, function(error) { console.log ("addIceCandidate error:" + JSON.stringify(error)); } );

	}catch (e) {
		//this.disconnect();
		alert("connect ProcessRemoteIce error: " + e);
	}
} 

H5sPlayerRTC.prototype.onWebSocketData = function(msg)	
{
	if(msg.data instanceof ArrayBuffer)
	{
		//console.log("ArrayBuffer =====");
	}
	
	//if (typeof message !== 'string')
	if(typeof msg.data === 'string')
	{
		//console.log("String ======");
	}
	
	console.log("RTC received ", msg.data);
	var msgrtc = JSON.parse(msg.data);
	console.log("Get Message type ", msgrtc.type);
	if (msgrtc.type === 'offer')
	{
		console.log("Process Message type ", msgrtc.type);
		this.ProcessRTCOffer(msgrtc);
		return;

	}

	if (msgrtc.type === 'remoteice')
	{
		console.log("Process Message type ", msgrtc.type);
		this.ProcessRemoteIce(msgrtc);
		return;

	}
	
	if (this._pbconf != undefined && this._pbconf.callback != undefined)
	{
		this._pbconf.callback(msg.data, this._pbconf.userdata);
	}
} 
	

H5sPlayerRTC.prototype.setupWebSocket = function(token)	
{
	this.video.autoplay = true;
	
	//var h5spath = this.video.getAttribute('h5spath');
	var h5spath = "api/v1/h5srtcapi";
	//var token = this.video.getAttribute('token');
	
	var streamprofile = 'main';
	if (this._conf.streamprofile === undefined)
	{}else 
	{
		streamprofile = this._conf.streamprofile;
	}
	
	if (this._pbconf === undefined)
	{
		h5spath = this._conf.rootpath + h5spath + "?token=" + token + "&profile=" + streamprofile + '&session=' + this._conf.session;
	}else 
	{
		var serverpb = 'false';
		var filename = 'fake';
		if (this._pbconf.serverpb === undefined)
		{}else 
		{
			serverpb = this._pbconf.serverpb;
		}
		
		if (this._pbconf.filename === undefined)
		{}else 
		{
			filename = this._pbconf.filename;
		}		
		h5spath = this._conf.rootpath + h5spath + "?token=" + token 
								+ "&playback=true"
								+ "&profile=" + streamprofile
								+ "&serverpb=" + serverpb
								+ "&begintime=" + encodeURIComponent(this._pbconf.begintime)//this._pbconf.begintime
								+ "&endtime=" + encodeURIComponent(this._pbconf.endtime)//this._pbconf.endtime
								+ "&filename=" + filename//file name
								+ '&session=' + this._conf.session;
	}
	
	console.log(h5spath);
	
	this.wsSocket = this.H5SWebSocketClient(h5spath);
	console.log("setupWebSocket", this.wsSocket);
	this.wsSocket.binaryType = 'arraybuffer';
	this.wsSocket.h5 = this;
	this.wsSocket.onmessage = this.onWebSocketData.bind(this);
	
	this.wsSocket.onopen = function()
	{
		console.log("wsSocket.onopen", this.h5);

		var j = {};
		j.type = "open";
		this.h5.wsSocket.send(JSON.stringify(j));
		
		this.h5.keepaliveTimerId = setInterval(this.h5.keepaliveTimer.bind(this.h5), 1000);
		if (this.h5._pbconf != undefined && this.h5._pbconf.autoplay === 'true')
		{
			this.h5.start();
		}

	}
	
	this.wsSocket.onclose = function () {
		console.log("wsSocket.onclose", this.h5);
		if (this.h5.bDisConnected === true)
		{
			console.log("wsSocket.onclose disconnect");
		}else
		{
			this.h5.bNeedReconnect = true;
		}
		
		this.h5.CleanupWebSocket(this.h5);
	}

}


H5sPlayerRTC.prototype.CleanupWebSocket = function(h5sPlayer)
{
	console.log('CleanupWebSocket', h5sPlayer);
	clearInterval(h5sPlayer.keepaliveTimerId);
	h5sPlayer.emptyBuffCnt = 0;
	h5sPlayer.lastBuffTime = 0;
	h5sPlayer.buffTimeSameCnt = 0;
}


/** 
 * Connect a websocket Stream to videoElement 
*/
H5sPlayerRTC.prototype.connect = function() {
	/* start connect to server */
	this.setupWebSocket(this._token);
	this.reconnectTimerId = setInterval(this.ReconnectFunction.bind(this), 3000);
}


/** 
 * Disconnect a websocket Stream and clear videoElement source
*/
H5sPlayerRTC.prototype.disconnect = function() {
	console.log("disconnect", this);
	this.bDisConnected = true;
	clearInterval(this.reconnectTimerId);
	
	if (this.wsSocket != null)
	{
		this.wsSocket.close();
		this.wsSocket = null;
	}
	
	if (this._videodom)
	{
		this._videodom.src ="";
	}
	
	if (this.pc) 
	{
		try {
			this.pc.close();
		}
		catch (e) {
			console.log ("close peer connection failed:" + e);
		}
		this.pc = null;
	}

	console.log("disconnect", this);
} 

H5sPlayerRTC.prototype.start = function(){
	try {
		var j = {};
		j.cmd = "H5_START";
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerRTC.prototype.pause = function(){
	try {
		var j = {};
		j.cmd = "H5_PAUSE";
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerRTC.prototype.resume = function(){
	try {
		var j = {};
		j.cmd = "H5_RESUME";
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerRTC.prototype.seek = function(nTime){
	try {
		var j = {};
		j.cmd = "H5_SEEK";
		j.nSeekTime = nTime;
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerRTC.prototype.speed = function(nSpeed){
	try {
		var j = {};
		j.cmd = "H5_SPEED";
		j.nSpeed = nSpeed;
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

/**
 *=================HLS based Player
 *
 */
/** 
 * Interface with h5s websocket player API
 * @constructor
 * @param 
 var conf = {
	videoid:'h5sVideo1', //{string} - id of the video element tag
	videodom: h5svideodom1, //{object} - video dom. if there has videoid, just use the videoid
	protocol: window.location.protocol, // {string} - 'http:' or 'https:'
	host: window.location.host, //{string} - 'localhost:8080'
	rootpath:window.location.pathname, // {string} - path of the app running
	token:'token1', // {string} - token of stream
	hlsver:'v1', //{string} -  v1 is for ts, v2 is for fmp4 
	session:'c1782caf-b670-42d8-ba90-2244d0b0ee83' //{string} - session got from login
};
*/
function H5sPlayerHls(conf)
{
	this.wsSocket;
	this.keepaliveTimerId;

	this._conf = conf;
	
	this._videoId = conf.videoid;
	this._token = conf.token;
	
	this._reConnectInterval;
	this._version = conf.hlsver;

	//console.log(conf.token, this._videoId);
	if (this._videoId === undefined)
	{
		this._videodom = conf.videodom;
		console.log(conf.token, "use dom directly");
	}else
	{
		this._videodom = document.getElementById(this._videoId);
		console.log(conf.token, "use videoid");
	}
	this._video = this._videodom;
	
	this._video.type="application/x-mpegURL";
	//webView.mediaPlaybackRequiresUserAction = NO;
	
	
	this._lastTime = 0;
	this._sameCnt = 0;
	
	var strPosterUri = this._conf.protocol + '//' + window.location.host + 
									'/api/v1/GetImage?token=' + this._token + '&session=' + this._conf.session;
	this._videodom.setAttribute('poster',strPosterUri);
	
		
}

H5sPlayerHls.prototype.H5SWebSocketClient = function(h5spath) 
{
	var socket;
	console.log("H5SWebSocketClient");
	try {
		//alert(this._conf.protocol);
		if (this._conf.protocol == "http:") 
		{
			if (typeof MozWebSocket != "undefined")
			{
				socket = new MozWebSocket('ws://' + this._conf.host  +  h5spath);
			}else
			{
				socket = new WebSocket('ws://' + this._conf.host +  h5spath);
			}
		}
		if (this._conf.protocol == "https:")
		{	
			//alert(this._conf.host);
			console.log(this._conf.host);
			if (typeof MozWebSocket != "undefined")
			{
				socket = new MozWebSocket('wss://' + this._conf.host +  h5spath);
			}else
			{
				socket = new WebSocket('wss://' + this._conf.host + h5spath);
			}				
		}
		console.log(this._conf.host);
	} catch (e) {
		alert('error');
		return;
	}
	return socket;
}

H5sPlayerHls.prototype.keepaliveTimer = function()	
{
	try {
		var j = {};
		j.type = "keepalive";
		this.wsSocket.send(JSON.stringify(j));
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerHls.prototype.onWebSocketData = function(msg)	
{
	console.log("HLS received ", msg.data);
} 
	

H5sPlayerHls.prototype.setupWebSocket = function(token)	
{
	
	//var h5spath = this.video.getAttribute('h5spath');
	var h5spath = "api/v1/h5swscmnapi";
	//var token = this.video.getAttribute('token');
	h5spath = this._conf.rootpath + h5spath + "?token=" + token + '&session=' + this._conf.session;
	console.log(h5spath);
	
	this.wsSocket = this.H5SWebSocketClient(h5spath);
	console.log("setupWebSocket", this.wsSocket);
	this.wsSocket.binaryType = 'arraybuffer';
	this.wsSocket.h5 = this;
	this.wsSocket.onmessage = this.onWebSocketData.bind(this);
	
	this.wsSocket.onopen = function()
	{
		console.log("wsSocket.onopen", this.h5);

		this.h5.keepaliveTimerId = setInterval(this.h5.keepaliveTimer.bind(this.h5), 1000);

	}
	
	this.wsSocket.onclose = function () {
		console.log("wsSocket.onclose", this.h5);
		
		this.h5.CleanupWebSocket(this.h5);
	}

}


H5sPlayerHls.prototype.CleanupWebSocket = function(h5sPlayer)
{
	console.log('H5sPlayerHls CleanupWebSocket', h5sPlayer);
	clearInterval(h5sPlayer.keepaliveTimerId);
}

H5sPlayerHls.prototype.CheckPlaying = function()
{
	console.log("HLS video.ended", this._video.ended);
	console.log("HLS video.currentTime", this._video.currentTime);
	var currentTime = this._video.currentTime;
	//if (this._lastTime != 0)
	{
		var diff = currentTime - this._lastTime;
		console.log("HLS diff", diff);
		if (diff === 0)
		{
			this._sameCnt ++;
		}
	}
	this._lastTime = currentTime;
	if (this._sameCnt > 3)
	{
		if (this.wsSocket != null)
		{
			this.wsSocket.close();
			this.wsSocket = null;
		}
		this.setupWebSocket(this._token);
		console.log("HLS reconnect");
		this._video.src = '';
		this._lastTime = 0;
		this._sameCnt = 0;
		this._video.src = this._conf.protocol + '//' + this._conf.host + this._conf.rootpath + 'hls/' + this._version + '/' + this._token + '/hls.m3u8';
		this._video.play();
		
	}
}

/** 
 * Connect a websocket Stream to videoElement 
 * @param {string} id - id of WebRTC stream
*/
H5sPlayerHls.prototype.connect = function() {
	this.setupWebSocket(this._token);

	this._lastTime = 0;
	this._sameCnt = 0;

	this._video.onended = function(e) {
		console.log('The End');
	};
	this._video.onpause = function(e) {
		console.log('Pause');
	};
	
	this._video.onplaying = function(e) {
		console.log('Playing');
	};
	this._video.onseeking = function(e) {
		console.log('seeking');
	};
	this._video.onvolumechange = function(e) {
		console.log('volumechange');
	};
	this._video.src = this._conf.protocol + '//' + this._conf.host + this._conf.rootpath + 'hls/' + this._version + '/' + this._token + '/hls.m3u8';
	
	this._video.play();
	this._reConnectInterval = setInterval(this.CheckPlaying.bind(this), 3000);
}


/** 
 * Disconnect a websocket Stream and clear videoElement source
*/
H5sPlayerHls.prototype.disconnect = function() {
	clearInterval(this._reConnectInterval);
	this._lastTime = 0;
	this._sameCnt = 0;
	if (this.wsSocket != null)
	{
		this.wsSocket.close();
		this.wsSocket = null;
	}
	console.log("disconnect", this);
}


/** 
 *=================Audio player and Intercomm
 */
/** 
 * Interface with h5s audio player API
 * @constructor
 * @param 
 var conf = {
	protocol: window.location.protocol, // {string} - http: or https:
	host: window.location.host, //{string} - localhost:8080
	rootpath:window.location.pathname, // {string} - path of the app running
	token:'token1', // {string} - token of stream
	session:'c1782caf-b670-42d8-ba90-2244d0b0ee83' //{string} - session got from login
};
*/

function H5sPlayerAudio(conf)
{
	this.buffer = [];	
	this.wsSocket;
	this.bNeedReconnect = false;
	this.bDisConnected = false;
	this._conf = conf;
	console.log("Aduio Player Conf:", conf);
	
	this._token = conf.token;
	this._audContext = new AudioContext();
	
	/*
	window.AudioContext ||
	window.webkitAudioContext ||
	window.mozAudioContext ||
	window.oAudioContext ||
	window.msAudioContext;
	*/
}

H5sPlayerAudio.prototype.H5SWebSocketClient = function(h5spath) 
{
	var socket;
	console.log("H5SWebSocketClient");
	try {
		//alert(this._conf.protocol);
		if (this._conf.protocol == "http:") 
		{
			if (typeof MozWebSocket != "undefined")
			{
				socket = new MozWebSocket('ws://' + this._conf.host  +  h5spath);
			}else
			{
				socket = new WebSocket('ws://' + this._conf.host +  h5spath);
			}
		}
		if (this._conf.protocol == "https:")
		{	
			//alert(this._conf.host);
			console.log(this._conf.host);
			if (typeof MozWebSocket != "undefined")
			{
				socket = new MozWebSocket('wss://' + this._conf.host +  h5spath);
			}else
			{
				socket = new WebSocket('wss://' + this._conf.host + h5spath);
			}				
		}
		console.log(this._conf.host);
	} catch (e) {
		alert('error');
		return;
	}
	return socket;
}

H5sPlayerAudio.prototype.keepaliveTimer = function()	
{
	try {
		this.wsSocket.send("keepalive");
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerAudio.prototype.onWebSocketData = function(msg)	
{
	var dataArray = new Int16Array(msg.data);
	var nSamples = 8000;
	var nChannel = 1;
	var nCount = dataArray.length;

	var buffer = this._audContext.createBuffer(nChannel, nCount, nSamples);

	for (var ch = 0; ch < nChannel; ch++) {
		var nowBuffering = buffer.getChannelData(ch);
		for (var i = 0; i < nCount; i++) {
			// Math.random() is in [0; 1.0]
			// audio needs to be in [-1.0; 1.0]
			nowBuffering[i] = dataArray[i] / (32767/2);
		}
	}

	var bufferSource = this._audContext.createBufferSource();
	bufferSource.buffer = buffer;
	bufferSource.connect(this._audContext.destination);
	bufferSource.start();
}

H5sPlayerAudio.prototype.CleanupWebSocket = function(h5sPlayer)
{
	console.log('CleanupWebSocket', h5sPlayer);
	clearInterval(h5sPlayer.keepaliveTimerId);
	//h5sPlayer.emptyBuffCnt = 0;
	//h5sPlayer.lastBuffTime = 0;
	//h5sPlayer.buffTimeSameCnt = 0;
}


H5sPlayerAudio.prototype.setupWebSocket = function(token)	
{
	//var h5spath = this.video.getAttribute('h5spath');
	var h5spath = "api/v1/h5saudapi";
	//var token = this.video.getAttribute('token');
	h5spath = this._conf.rootpath + h5spath + "?token=" + token + '&session=' + this._conf.session;
	console.log(h5spath);
	
	this.wsSocket = this.H5SWebSocketClient(h5spath);
	console.log("setupWebSocket for audio", this.wsSocket);
	this.wsSocket.binaryType = 'arraybuffer';
	this.wsSocket.h5 = this;
	this.wsSocket.onmessage = this.onWebSocketData.bind(this);
	
	this.wsSocket.onopen = function()
	{
		console.log("wsSocket.onopen", this.h5);
		this.h5.keepaliveTimerId = setInterval(this.h5.keepaliveTimer.bind(this.h5), 1000);
	}
	
	this.wsSocket.onclose = function () {
		console.log("wsSocket.onclose", this.h5);
		this.h5.CleanupWebSocket(this.h5);
		//this.h5._strCodec = "";
		//this.h5._bGetCodec = false;
	}
}

/** 
 * Connect a websocket audio 
*/
H5sPlayerAudio.prototype.connect = function() {
	/* start connect to server */
	this.setupWebSocket(this._token);
}


/** 
 * Disconnect a websocket audio 
*/
H5sPlayerAudio.prototype.disconnect = function() {
	console.log("disconnect", this);
	
	if (this.wsSocket != null)
	{
		this.wsSocket.close();
		this.wsSocket = null;
	}
	console.log("disconnect", this);
}

/** 
 *=================Audio Intercomm
 */
/** 
 * Interface with h5s audio intecom API
 * @constructor
 * @param 
 var conf = {
	protocol: window.location.protocol, // {string} - http: or https:
	host: window.location.host, //{string} - localhost:8080
	rootpath:window.location.pathname, // {string} - path of the app running
	token:'token1', // {string} - token of stream
	session:'c1782caf-b670-42d8-ba90-2244d0b0ee83' //{string} - session got from login
};
*/
function H5sPlayerAudBack(conf)
{
	this.buffer = [];	
	this.wsSocket;
	this.bNeedReconnect = false;
	this.bDisConnected = false;
	this._conf = conf;
	this._cnt = 0;
	this._samplerate = 48000;
	this._bInit = false;
	console.log("Aduio Back Conf:", conf);
	
	this._token = conf.token;
	this._audContext = new AudioContext();
	console.log("sampleRate", this._audContext.sampleRate);
	this.OpenAudio();
	
	/*
	window.AudioContext ||
	window.webkitAudioContext ||
	window.mozAudioContext ||
	window.oAudioContext ||
	window.msAudioContext;
	*/
	
}

H5sPlayerAudBack.prototype.H5SWebSocketClient = function(h5spath) 
{
	var socket;
	console.log("H5SWebSocketClient");
	try {
		//alert(this._conf.protocol);
		if (this._conf.protocol == "http:") 
		{
			if (typeof MozWebSocket != "undefined")
			{
				socket = new MozWebSocket('ws://' + this._conf.host  +  h5spath);
			}else
			{
				socket = new WebSocket('ws://' + this._conf.host +  h5spath);
			}
		}
		if (this._conf.protocol == "https:")
		{	
			//alert(this._conf.host);
			console.log(this._conf.host);
			if (typeof MozWebSocket != "undefined")
			{
				socket = new MozWebSocket('wss://' + this._conf.host +  h5spath);
			}else
			{
				socket = new WebSocket('wss://' + this._conf.host + h5spath);
			}				
		}
		console.log(this._conf.host);
	} catch (e) {
		alert('error');
		return;
	}
	return socket;
}

H5sPlayerAudBack.prototype.keepaliveTimer = function()	
{
	try {
		this.wsSocket.send("keepalive");
	} catch (e) {
	  console.log(e);
	}
}

H5sPlayerAudBack.prototype.onWebSocketData = function(msg)	
{

}

H5sPlayerAudBack.prototype.CleanupWebSocket = function(h5sPlayer)
{
	console.log('CleanupWebSocket', h5sPlayer);
	clearInterval(h5sPlayer.keepaliveTimerId);
}

H5sPlayerAudBack.prototype.OpenAudio = function()
{
	console.log("sampleRate", this._audContext.sampleRate);
	
    navigator.getUserMedia = (navigator.getUserMedia || 
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia);
	//console.log("wsSocket.onopen", this);
	try {
		navigator.getUserMedia({ video: false, audio: true }, 
					this.AudioProcess.bind(this));
	} catch (e) {
		alert('Audio back false getUserMedia', e);
		return;
	}
}

H5sPlayerAudBack.prototype.webSocketOnOpen = function()
{
	this._bInit = true;
}

H5sPlayerAudBack.prototype.setupWebSocket = function(token)	
{
	//var h5spath = this.video.getAttribute('h5spath');
	var h5spath = "api/v1/h5saudbackapi";
	//var token = this.video.getAttribute('token');
	h5spath = this._conf.rootpath + h5spath + "?token=" + token + '&samplerate=' + this._samplerate + '&session=' + this._conf.session;
	console.log(h5spath);
	
	this.wsSocket = this.H5SWebSocketClient(h5spath);
	console.log("setupWebSocket for audio back", this.wsSocket);
	this.wsSocket.binaryType = 'arraybuffer';
	this.wsSocket.h5 = this;
	this.wsSocket.onmessage = this.onWebSocketData.bind(this);
	
	this.wsSocket.onopen = this.webSocketOnOpen.bind(this);
	
	this.wsSocket.onclose = function () {
		console.log("wsSocket.onclose", this.h5);
		this.h5.CleanupWebSocket(this.h5);
	}
}

function float32ToInt16(buffer) {
	var l = buffer.length;
	var buf = new Int16Array(l);
	while (l--) {
		buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
	}
	return buf;
}

H5sPlayerAudBack.prototype.AudioSend = function(e) {
	var left = e.inputBuffer.getChannelData(0);
	var binaryData = float32ToInt16(left);
	//console.log(this._cnt ++);
	//console.log(binaryData);
	
	if (this._bInit === true && this.wsSocket)
		this.wsSocket.send(binaryData);

}

/* Audio process and send to server */
H5sPlayerAudBack.prototype.AudioProcess = function(stream) {
	try {
		var mediaStreamSource = this._audContext.createMediaStreamSource(stream);
		
		//TODO send the sampleRate before to send data
		//1024 2048 4096 can work
		var streamNode = this._audContext.createScriptProcessor(1024, 1, 1);
		
		
		mediaStreamSource.connect(streamNode);

		streamNode.connect(this._audContext.destination);
		streamNode.onaudioprocess = this.AudioSend.bind(this);
	} catch (e) {
		alert('Audio intecomm error', e);
		return;
	}
}

/** 
 * Connect a websocket audio back 
*/
H5sPlayerAudBack.prototype.connect = function() {
	/* start connect to server */
	this.setupWebSocket(this._token);
}

/** 
 * Disconnect a websocket audio back  
*/
H5sPlayerAudBack.prototype.disconnect = function() {
	console.log("disconnect", this);
	
	if (this.wsSocket != null)
	{
		this.wsSocket.close();
		this.wsSocket = null;
	}
	console.log("disconnect", this);
}
