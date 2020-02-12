(function(global){

  var glUtils = {
    VERSION : '0.0.6',
    checkWebGL: function(canvas, opts) {
      /**
       * Check if WebGL is available.
       **/
      var contexts = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"], gl;
      for (var i=0; i < contexts.length; i++) {
        try {
          gl = canvas.getContext(contexts[i], opts);
        } catch(e) {}
        if (gl) {
          break;
        }
      }
      if (!gl) {
        alert("WebGL not available, sorry! Please use a new version of Chrome or Firefox.");
      }
      return gl;
    },

    createProgram: function(gl, vertexShader, fragmentShader) {
      /**
       * Create and return a shader program
       **/
      var program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      // Check that shader program was able to link to WebGL
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        var error = gl.getProgramInfoLog(program);
        console.log('Failed to link program: ' + error);
        gl.deleteProgram(program);
        gl.deleteShader(fragmentShader);
        gl.deleteShader(vertexShader);
        return null;
      }

      // Set the vertex and fragment shader to the program for easy access
      program.vertexShader = vertexShader;
      program.fragmentShader = fragmentShader;
      return program;
    },

    getShader: function(gl,type,source) {
      /**
       * Get, compile, and return an embedded shader object
       **/
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      // Check if compiled successfully
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log("An error occurred compiling the shaders:" + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      // Set the attributes, varying, and uniform to shader
      shader.attributes = this.attributesFromSource(source);
      shader.varyings = this.varyingsFromSource(source);
      shader.uniforms = this.uniformsFromSource(source);
      return shader;
    },

    /*
     * Get attributes, varyings, and uniforms from source dynamically.
     */
    xFromSource: function(source, x) {
      var xs = [];
      var lines = source.split('\n');
      for (var i=0; i<lines.length; i++) {
        var line = lines[i];
        // check that it contains the keyword at the beginning of the line (not a comment)
        if (line.slice(0, x.length) == x) {
          var words = line.split(' ');
          // remove the semicolon
          var name = words[2].slice(0, words[2].length-1);
          xs.push({type:words[1], name:name});
        }
      }
      return xs;
    },
    attributesFromSource: function(source) {
      return this.xFromSource(source, 'attribute');
    },
    varyingsFromSource: function(source) {
      return this.xFromSource(source, 'varying');
    },
    uniformsFromSource: function(source) {
      return this.xFromSource(source, 'uniform');
    }
  };

  /*
   * ShaderLoader: get shaders from HTML, or from external source
   */
  glUtils.SL = {
    sourceFromHtml: function(opts) {
      var opts = opts || {};
      this.elemName = opts.elemName || "shader";
      this.dataType = opts.dataType || "data-type";
      this.dataVersion = opts.dataVersion || "data-version";
      this.shaderElems = document.getElementsByName(this.elemName);
      this.Shaders = this.Shaders || {};
      this.slShaderCount = this.shaderElems.length;
      for(var i = 0; i < this.slShaderCount; i++) {
        var shader = this.shaderElems[i];
        if (!shader) {
          return null;
        }

        var source = "";
        var currentChild = shader.firstChild;
        while (currentChild) {
          if (currentChild.nodeType == currentChild.TEXT_NODE) {
            source += currentChild.textContent;
          }
          currentChild = currentChild.nextSibling;
        }

        var version = shader.getAttribute(this.dataVersion);
        if(!this.Shaders[version]) {
          this.Shaders[version] = {
            vertex: '',
            fragment: ''
          };
        }
        this.Shaders[version][shader.getAttribute(this.dataType)] = source;
      }
    },
    /*
     * Ajax stuff
     */
    XMLHttpFactories: [
      function () {return new XMLHttpRequest()},
      function () {return new ActiveXObject("Msxml2.XMLHTTP")},
      function () {return new ActiveXObject("Msxml3.XMLHTTP")},
      function () {return new ActiveXObject("Microsoft.XMLHTTP")}
    ],
    createXMLHTTPObject: function() {
      var xmlhttp = false;
      for (var i=0;i< this.XMLHttpFactories.length;i++) {
        try { xmlhttp = this.XMLHttpFactories[i](); }
        catch (e) { continue; }
        break;
      }
      return xmlhttp;
    },
    sendRequest: function(url,callback,element) {
      var req = this.createXMLHTTPObject();
      if (!req) return;
      var method = "GET";
      req.open(method,url,true);
      req.onreadystatechange = function () {
        if (req.readyState != 4) return;
        if (req.status != 0 && req.status != 200 && req.status != 304) {
          return;
        }
        callback(req,element);
      }
      if (req.readyState == 4) return;
      req.send();
    },
    /*
     * Signals
     */
    init: function(opts) {
      var opts = opts || {};
      this.callback = opts.callback || function() {};
      this.elemName = opts.elemName || "shader";
      this.dataSrc = opts.dataSrc || "data-src";
      this.dataType = opts.dataType || "data-type";
      this.dataVersion = opts.dataVersion || "data-version";
      this.shaderElems = document.getElementsByName(this.elemName);
      this.loadedSignal = new global.signals.Signal();
      this.Shaders = this.Shaders || {};
      this.loadedSignal.add(this.callback);
      this.slShaderCount = this.shaderElems.length;
      for(var i = 0; i < this.slShaderCount; i++) {
        var shader = this.shaderElems[i];
        this.sendRequest(shader.getAttribute(this.dataSrc), this.processShader, shader);
      }
      this.checkForComplete();
    },
    checkForComplete: function() {
      if(!this.slShaderCount) {
        this.loadedSignal.dispatch();
      }
    },
    processShader: function(req,element) {
      glUtils.SL.slShaderCount--;
      var version = element.getAttribute(glUtils.SL.dataVersion);
      if(!glUtils.SL.Shaders[version]) {
        glUtils.SL.Shaders[version] = {
          vertex: '',
          fragment: ''
        };
      }
      glUtils.SL.Shaders[version][element.getAttribute(glUtils.SL.dataType)] = req.responseText;
      glUtils.SL.checkForComplete();
    },
  };

  // Expose glUtils globally
  global.glUtils = glUtils;

}(window || this));
