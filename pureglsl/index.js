var canvas, gl, program, points = [];
var colorCodes = ["#464A4C", "#4B4E50", "#515556", "#55595C", "#595E61", "#5E6366", "#646B6D", "#6D7376", "#767B7E", "#7D8284", "#818688", "#878D8F", "#8F9597", "#979C9F", "#9EA4A6", "#A6ACAF", "#AEB5B7", "#B4BABB", "#C1BFC8", "#88E57E", "#6CE85E", "#68D75C", "#62CA57", "#5BBB50", "#52A948", "#4EA045", "#46913D", "#3E8237", "#387331", "#30662B", "#3C622A", "#5D7434", "#849C39", "#D1BE00", "#FDE300", "#FFE000", "#FFDA00", "#FFD400", "#FFCC00", "#FFBC00", "#FFA100", "#FF8A00", "#FF8400", "#FF7C00", "#FF7400", "#FF6C00", "#FF6200", "#FF5500", "#FF4A00", "#FF3A00", "#FE1800", "#FA0304", "#F30105", "#E80205", "#DC0104", "#D20004", "#C7010B", "#BD011D", "#B40036", "#A10091", "#A000C5", "#AB00D1", "#B900D7", "#C500DE", "#D001E4", "#DB03EA", "#E506EF", "#F008F5", "#FF04FA", "#33CEFE", "#00EFFF", "#00DAFF", "#00CEFF", "#00C7FF", "#00C2FF", "#00B8FF", "#00ACFF", "#0098FF", "#158FF0", "#BCB589", "#FFCF68", "#FFD68D", "#FFDFA4", "#FFE3B1", "#FFE8BE"];

glUtils.SL.init({
    callback: function () {
        main();
    }
});

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

var startTime, endTime;

// draw!
function draw() {
    startTime = Date.now();

    var pointsArray = [], colorsArray = [];
    for (var i = 0; i < points.length; i++) {
        pointsArray.push(points[i].x);
        pointsArray.push(points[i].y);
        colorsArray.push(points[i].c[0]);
        colorsArray.push(points[i].c[1]);
        colorsArray.push(points[i].c[2]);
        colorsArray.push(points[i].c[3]);
        //debugger;
    }
    var arrays = [{name: 'aColor', array: colorsArray, size: 4},
        {name: 'aPosition', array: pointsArray, size: 2}];
    var n = pointsArray.length / 2;

    // Render the arrays
    renderBuffers(arrays);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, n);
    //gl.drawArrays(gl.POLYGON_OFFSET_FILL, 0, n);
    // gl.drawArrays(gl.LINES, 0, n);
    //gl.drawArrays(gl.LINE_STRIP, 0, n);
    //gl.drawArrays(gl.LINE_LOOP, 0, n);
    gl.drawArrays(gl.TRIANGLES, 0, n);
    //gl.drawArrays(gl.TRIANGLE_FAN, 0, n);

    //gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
    console.log(Date.now() - startTime + "ms");
}

// Create and set the buffers
function initBuffers(gl) {
    var attributes = program.vertexShader.attributes;
    for (var i = 0; i < attributes.length; i++) {
        program[attributes[i].name] = gl.createBuffer();
    }
}

// Render the buffers
function renderBuffers(arrays) {
    var attributes = program.vertexShader.attributes;
    for (var i = 0; i < attributes.length; i++) {
        var name = attributes[i].name;
        for (var j = 0; j < arrays.length; j++) {
            if (name === arrays[j].name) {
                var attr = gl.getAttribLocation(program, name);
                gl.enableVertexAttribArray(attr);
                gl.bindBuffer(gl.ARRAY_BUFFER, program[name]);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrays[j].array), gl.STATIC_DRAW);
                gl.vertexAttribPointer(attr, arrays[j].size, gl.FLOAT, false, 0, 0);
            }
        }
    }
}


function pixelInputToGLCoord(event, canvas) {
    var x = event.clientX,
        y = event.clientY,
        midX = canvas.width / 2,
        midY = canvas.height / 2,
        // rect = event.target.getBoundingClientRect();
        rect = event.rect;
    x = ((x - rect.left) - midX) / midX;
    y = (midY - (y - rect.top)) / midY;


    return {x: x, y: y};
}


function loadJSON(callback) {

    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', '../resources/2020_01_21_16_17_01.json', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {

            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}


function init() {
    loadJSON(function (response) {
        // Parse JSON string into object
        var actual_JSON = JSON.parse(response);
        renderJSON(actual_JSON);

    });
}

function renderJSON(radar_JSON) {
    console.log("I have got data to render");
    //console.log(radar_JSON);
    //console.log(radar_JSON.meters_to_first_gate);
    //radar_JSON.radius = 3000;
    var scaleFactor = 100;

    radarCenter = {x: parseFloat(radar_JSON.radius) / scaleFactor, y: parseFloat(radar_JSON.radius) / scaleFactor}
    var colorCodes = ["#464A4C", "#4B4E50", "#515556", "#55595C", "#595E61", "#5E6366", "#646B6D", "#6D7376", "#767B7E", "#7D8284", "#818688", "#878D8F", "#8F9597", "#979C9F", "#9EA4A6", "#A6ACAF", "#AEB5B7", "#B4BABB", "#C1BFC8", "#88E57E", "#6CE85E", "#68D75C", "#62CA57", "#5BBB50", "#52A948", "#4EA045", "#46913D", "#3E8237", "#387331", "#30662B", "#3C622A", "#5D7434", "#849C39", "#D1BE00", "#FDE300", "#FFE000", "#FFDA00", "#FFD400", "#FFCC00", "#FFBC00", "#FFA100", "#FF8A00", "#FF8400", "#FF7C00", "#FF7400", "#FF6C00", "#FF6200", "#FF5500", "#FF4A00", "#FF3A00", "#FE1800", "#FA0304", "#F30105", "#E80205", "#DC0104", "#D20004", "#C7010B", "#BD011D", "#B40036", "#A10091", "#A000C5", "#AB00D1", "#B900D7", "#C500DE", "#D001E4", "#DB03EA", "#E506EF", "#F008F5", "#FF04FA", "#33CEFE", "#00EFFF", "#00DAFF", "#00CEFF", "#00C7FF", "#00C2FF", "#00B8FF", "#00ACFF", "#0098FF", "#158FF0", "#BCB589", "#FFCF68", "#FFD68D", "#FFDFA4", "#FFE3B1", "#FFE8BE"];


    var pointsArrary = [];
    var ind = 0;
    for (var angle = 0; angle <= 359.5; angle += 0.5) {
        pointsArrary[ind] = [];
        for (var circleNo = 0; circleNo < 912; circleNo++) {

            pointsArrary[ind].push(pointOnCircle(parseFloat(parseFloat(radar_JSON.meters_to_first_gate) / scaleFactor + circleNo * (parseFloat(radar_JSON.meters_between_gates)) / scaleFactor), angle));
        }
        ind++;

    }
    console.log("CALCULATION DONE");
    createPolygons(pointsArrary, radar_JSON);

    draw();


}

function pointOnCircle(r, angle) {
    return {
        x: r * Math.cos(degrees_to_radians(angle)) + radarCenter.x,
        y: r * Math.sin(degrees_to_radians(angle)) + radarCenter.y
    };
}

function degrees_to_radians(degrees) {
    var pi = Math.PI;
    return degrees * (pi / 180);
}

function createPolygons(pointsArray, radar_JSON) {

    for (var i = 0; i < 720; i++) {
        //console.log(i);
        for (var j = 0; j < pointsArray[i].length - 1; j += 1) {

            createBox(pointsArray[i][j].x, pointsArray[i][j].y,
                pointsArray[i][j + 1].x, pointsArray[i][j + 1].y,
                pointsArray[i + 1 === 720 ? 0 : i + 1][j + 1].x, pointsArray[i + 1 === 720 ? 0 : i + 1][j + 1].y,
                pointsArray[i + 1 === 720 ? 0 : i + 1][j].x, pointsArray[i + 1 === 720 ? 0 : i + 1][j].y,
                colorCodes[parseInt(radar_JSON.values[i][j])]
            )

        }
    }

}

function createBox(x1, y1, x2, y2, x3, y3, x4, y4, color) {
    var colorArr = hexToRGB(color, 1);
    //console.log(colorArr);

    var point = pixelInputToGLCoord({clientX: x1, clientY: y1, rect: {top: -48, left: 0}}, {width: 4600, height: 4600});
    point.c = colorArr;
    points.push(point);
    point = pixelInputToGLCoord({clientX: x2, clientY: y2, rect: {top: -48, left: 0}}, {width: 4600, height: 4600});
    point.c = colorArr;
    points.push(point);
    point = pixelInputToGLCoord({clientX: x3, clientY: y3, rect: {top: -48, left: 0}}, {width: 4600, height: 4600});
    point.c = colorArr;
    points.push(point);
    point = pixelInputToGLCoord({clientX: x4, clientY: y4, rect: {top: -48, left: 0}}, {width: 4600, height: 4600});
    point.c = colorArr;
    points.push(point);
    point = pixelInputToGLCoord({clientX: x3, clientY: y3, rect: {top: -48, left: 0}}, {width: 4600, height: 4600});
    point.c = colorArr;
    points.push(point);
    point = pixelInputToGLCoord({clientX: x4, clientY: y4, rect: {top: -48, left: 0}}, {width: 4600, height: 4600});
    point.c = colorArr;

    points.push(point);

    point = pixelInputToGLCoord({clientX: x1, clientY: y1, rect: {top: -48, left: 0}}, {width: 4600, height: 4600});
    point.c = colorArr;
    points.push(point);

}


function hexToRGB(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);

    if (alpha) {
        return [r, g, b, alpha];
        //return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    } else {
        return "rgb(" + r + ", " + g + ", " + b + ")";
    }
}


init();