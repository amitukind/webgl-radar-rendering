

  var canvas, gl, program, points = [];

  glUtils.SL.init({ callback:function() { main(); } });

  function main() {
    // Get canvas element and check if WebGL enabled
    canvas = document.getElementById("glcanvas");
    gl = glUtils.checkWebGL(canvas);

    // Initialize the shaders and program
    var vertexShader = glUtils.getShader(gl, gl.VERTEX_SHADER, glUtils.SL.Shaders.v1.vertex),
        fragmentShader = glUtils.getShader(gl, gl.FRAGMENT_SHADER, glUtils.SL.Shaders.v1.fragment);

    program = glUtils.createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);

    // UI events
    canvas.addEventListener('mousedown', onmousedown);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    initBuffers(gl);
  }

  // draw!
  function draw() {
    var pointsArray = [], colorsArray = [];
    for (var i=0; i<points.length; i++) {
      pointsArray.push(points[i].x);
      pointsArray.push(points[i].y);
      colorsArray.push(points[i].c[0]);
      colorsArray.push(points[i].c[1]);
      colorsArray.push(points[i].c[2]);
      colorsArray.push(points[i].c[3]);
    }
    var arrays = [{name:'aColor', array:colorsArray, size:4},
                  {name:'aPosition', array:pointsArray, size:2}];
    var n = pointsArray.length/2;

    // Render the arrays
    renderBuffers(arrays);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, n);
    // gl.drawArrays(gl.LINES, 0, n);
    //gl.drawArrays(gl.LINE_STRIP, 0, n);
    //gl.drawArrays(gl.LINE_LOOP, 0, n);
    gl.drawArrays(gl.TRIANGLES, 0, n);
    //gl.drawArrays(gl.TRIANGLE_FAN, 0, n);
    //gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
  }

  // Create and set the buffers
  function initBuffers(gl) {
    var attributes = program.vertexShader.attributes;
    for (var i=0; i<attributes.length; i++) {
      program[attributes[i].name] = gl.createBuffer();
    }
  }

  // Render the buffers
  function renderBuffers(arrays) {
    var attributes = program.vertexShader.attributes;
    for (var i=0; i<attributes.length; i++) {
      var name = attributes[i].name;
      for (var j=0; j<arrays.length; j++) {
        if (name == arrays[j].name) {
          var attr = gl.getAttribLocation(program, name);
          gl.enableVertexAttribArray(attr);
          gl.bindBuffer(gl.ARRAY_BUFFER, program[name]);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrays[j].array), gl.STATIC_DRAW);
          gl.vertexAttribPointer(attr, arrays[j].size, gl.FLOAT, false, 0, 0);
        }
      }
    }
  }

  // UI Events
  function onmousedown(event) {
    var point = pixelInputToGLCoord(event, canvas);
    point.c = [Math.random(), Math.random(), Math.random(), 1.0];
    points.push(point);
    draw();
  }


function pixelInputToGLCoord(event, canvas) {
  var x = event.clientX,
      y = event.clientY,
      midX = canvas.width/2,
      midY = canvas.height/2,
      rect = event.target.getBoundingClientRect();
  x = ((x - rect.left) - midX) / midX;
  y = (midY - (y - rect.top)) / midY;
  return {x:x,y:y};
};
