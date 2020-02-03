function RadarRendererGoogleMaps(map) {
    this.map = map;
    this.pointCloud = null;
    this.polygonCloud = null;
    this.sweepRadialCircle = null;

    this.colorTable = {};

    this.tower = null;
    this.sweep = null;
    this.opacity = 0.9;

    this.lastGateDepthSize = null;
    this.lastGateWidthSize = null;

    this.sweepMinValue = -1;
    this.sweepMaxValue = -1;

    this.renderDone = false;

    // 1 = Max. performance
    // 2 = Good performance
    // 3 = Balanced (auto)
    // 4 = Good quality
    // 5 = Best quality
    this.renderQualityLevel = 3;

    this.onPolygonClick = function() {};
    this.onPolygonMouseover = function() {};
    this.onPolygonMouseout = function() {};

    this.onSweepValueMinMaxChange = function() {};

    // Internals
    this.TRANSPARENT_POLYGON_MAGIC_NUMBER = -999999;

    this.debugMode = (window.user && window.user.isInternal) || location.pathname == "/test/";
};

RadarRendererGoogleMaps.prototype.reset = function() {
    var me = this;

    me.pointCloud = null;

    if (me.polygonCloud != null)
    {
        for(var r = 0; r < me.polygonCloud.length; ++r)
        {
            for(var g = 0; g < me.polygonCloud[r].length; ++g)
            {
                if (me.polygonCloud[r][g] != null)
                {
                    me.polygonCloud[r][g].setMap(null);
                }
            }
        }
    }

    me.polygonCloud = null;

    if (me.sweepRadialCircle != null)
    {
        me.sweepRadialCircle.setMap(null)
        me.sweepRadialCircle = null;
    }

    me.clearColorTable();

    me.tower = null;
    me.sweep = null;

    me.lastGateDepthSize = null;
    me.lastGateWidthSize = null;

    me.sweepMinValue = -1;
    me.sweepMaxValue = -1;
};

RadarRendererGoogleMaps.prototype.clearColorTable = function() {
    this.colorTable = {};
};

RadarRendererGoogleMaps.prototype.addColorTable = function(colors, key) {
    key = (typeof key !== 'undefined') ?  key : "DEFAULT";

    this.colorTable[key] = colors;
};

RadarRendererGoogleMaps.prototype.getColorFromTable = function(value, minValue, maxValue, key) {
    var me = this;

    key = (typeof(key) !== 'undefined') ?  key : "DEFAULT";

    var colorTable = me.colorTable[key];

    if(typeof(colorTable) == "undefined")
    {
        console.log("colorTable not found", key);
    }

    var step = (maxValue - minValue) / (colorTable.length - 1);
    var valueRoundedToNearestStep = Math.round(value / step) * step;
    var colorTableIndex = parseInt((-minValue + valueRoundedToNearestStep) / step);

    if(me.debugMode)
    {
        // console.log(value, minValue, maxValue)
        // console.log(step, valueRoundedToNearestStep, colorTableIndex)
    }

    if (colorTable[colorTableIndex] == undefined || colorTable[colorTableIndex] == null) return null;

    return colorTable[colorTableIndex];
};

RadarRendererGoogleMaps.prototype.render = function(tower, sweep, opacity) {
    var me = this;

    if(Object.keys(me.colorTable).length == 0)
    {
        return console.warn("No defined colormap");
    }

    me.tower = tower;

    if (me.debugMode)
    {
        console.log("Total gate count: ", sweep.values_count);
        // console.log(sweep.value.unit)
    }

    if (sweep.compressed)
    {
        var n;
        if (me.debugMode)
        {
            console.log("Sweep data is compressed")
            n = (new Date()).getTime();
        }

        me.sweep = me.inflateSweep(sweep);

        if (me.debugMode)
        {
            n = (new Date()).getTime() - n;
            console.log("Inflate latency: ", n);
        }
    }
    else
    {
        me.sweep = sweep;
    }

    me.opacity = opacity;

    if(me.sweepMinValue == -1 && me.sweepMaxValue == -1) {
        me.sweepMinValue = me.sweep.value.min;
        me.sweepMaxValue = me.sweep.value.max;

        var firstColorTableKey = Object.keys(me.colorTable)[0];
        var step = (me.sweepMaxValue - me.sweepMinValue) / (me.colorTable[firstColorTableKey].length - 1);

        // console.log(me.sweepMinValue, me.sweepMaxValue, me.colorTable.length, step)

        if(typeof(me.onSweepValueMinMaxChange) == "function") {
            me.onSweepValueMinMaxChange(me.sweepMinValue, me.sweepMaxValue, step);
        }
    }

    if (me.pointCloud == null) {
        // Setup point cloud for sweep, which then be used for subsequent sweeps
        me.pointCloud = me.getPointCloudForSweep(tower, sweep)
    }
    if (me.polygonCloud == null) {
        // Build polygon cloud using the point cloud
        me.polygonCloud = me.getEmptyPolygonCloud(sweep)
    }
    if (me.sweepRadialCircle == null) {
        me.sweepRadialCircle = me.renderSweepRadialCircle(tower, sweep)
    }

    me.redraw()
};

RadarRendererGoogleMaps.prototype.inflateSweep = function(sweep) {
    for (var i = 0; i < sweep.values.length; ++i) {
        var newRow = [];
        for (var g = 0; g < sweep.values[i].length; ++g) {
            var v = sweep.values[i][g];

            if(v > sweep.value.compression_mask)
            {
                var noValuesCount = v - sweep.value.compression_mask;
                for(var j = 0; j < noValuesCount; ++j)
                {
                    newRow.push(sweep.value.none);
                }
            }
            else
            {
                newRow.push(v);
            }
        }

        sweep.values[i] = newRow;
    }

    return sweep;
};

RadarRendererGoogleMaps.prototype.renderSweepRadialCircle = function(tower, sweep) {
    var me = this;

    if (me.sweepRadialCircle != null) {
        return console.error("Tried to add another sweep radial circle");
    }

    return new google.maps.Circle({
        strokeColor: '#000000',
        strokeOpacity: 0.1,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0,
        map: me.map,
        center: {
            lat: tower.lat,
            lng: tower.lon
        },
        radius: sweep.radius,
        zIndex: 0
    });
};

RadarRendererGoogleMaps.prototype.draw = function(gateDepthSize, gateWidthSize) {
    var me = this;

    if (Object.keys(me.colorTable).length == 0) {
        return console.warn("No color table has been specified");
    }

    var startTime;

    if(me.debugMode)
    {
        startTime = (new Date()).getTime();
    }

    var mapZoomLevel = me.map.getZoom();
    var screenBoundsPadding = mapZoomLevel * -1;
    if(mapZoomLevel == 12)
    {
        screenBoundsPadding = mapZoomLevel * -12;
    }
    else if(mapZoomLevel == 13)
    {
        screenBoundsPadding = mapZoomLevel * -16;
    }
    else if(mapZoomLevel == 14)
    {
        screenBoundsPadding = mapZoomLevel * -20;
    }
    else if(mapZoomLevel >= 15)
    {
        screenBoundsPadding = mapZoomLevel * -20;
    }
    var screenMapBounds = me.paddedBounds(me.map.getBounds(), screenBoundsPadding, screenBoundsPadding, screenBoundsPadding, screenBoundsPadding);
    var smpNELat = screenMapBounds.getNorthEast().lat();
    var smpNELon = screenMapBounds.getNorthEast().lng();
    var smpSWLat = screenMapBounds.getSouthWest().lat();
    var smpSWLon = screenMapBounds.getSouthWest().lng();

    var recyclePolygonCount = 0;
    var addPolygonCount = 0;
    var removePolygonCount = 0;

    // Detect if the gate size has changed since the last draw
    if (me.lastGateDepthSize != null && me.lastGateWidthSize != null) {
        if (me.lastGateDepthSize != gateDepthSize || me.lastGateWidthSize != gateWidthSize) {
            // console.log("Gate size changed !!!!!!!");
            for (var i = 0; i < me.polygonCloud.length; ++i) {
                for (var g = 0; g < me.polygonCloud[i].length; ++g) {
                    if (me.polygonCloud[i][g] != null) {
                        me.polygonCloud[i][g].setMap(null)
                        me.polygonCloud[i][g] = null;

                        ++removePolygonCount;
                    }
                }
            }
        }
    }

    me.lastGateDepthSize = gateDepthSize;
    me.lastGateWidthSize = gateWidthSize;

    var wtrColorTableKeys = ["WTR-SNOW", "WTR-MIXED", "WTR-RAIN"];
    var isWtr = me.sweep.product == "WTR" || me.sweep.product == "WTR2" || me.sweep.product == "WTR3" || me.sweep.product == "WTR4";

    var pointNoValue = me.sweep.value.none;

    for (var i = 0; i < me.pointCloud.length; i += gateWidthSize) {
        for (var g = 0; g < me.pointCloud[i].length - gateDepthSize; g += gateDepthSize) {

            var pointValue = me.sweep.values[i][g];

            var pointToRender = false;

            // First check if there is a value we want to render
            if (pointValue != pointNoValue)
            {
                if (pointValue >= me.sweepMinValue && pointValue <= me.sweepMaxValue)
                {
                    var pointColor = null;

                    if(isWtr)
                    {
                        // # SNOW = 0 
                        // # MIXED PRECIP = 1
                        // # RAIN = 2
                        var wtrType = me.sweep.wtr[i][g];
                        // console.log(wtrType, wtrColorTableKeys[wtrType])

                        if(wtrType == 0 || wtrType == 1 || wtrType == 2)
                        {
                            pointColor = me.getColorFromTable(pointValue, me.sweep.value.min, me.sweep.value.max, wtrColorTableKeys[wtrType])
                        }
                        else
                        {
                            if (me.debugMode)
                            {
                                console.log("bad wtrType", wtrType)

                                break;
                            }
                        }
                    }
                    else
                    {
                        pointColor = me.getColorFromTable(pointValue, me.sweep.value.min, me.sweep.value.max)
                    }

                    // console.log(pointColor)
                    // break;

                    if (pointColor != null)
                    {
                        var point = me.pointCloud[i][g];
                        // var pointInsideOfScreen = screenMapBounds.contains({
                        //     lat: point[0],
                        //     lng: point[1]
                        // });
                        var pointInsideOfScreen = point[0] < smpNELat && point[1] < smpNELon && point[0] > smpSWLat && point[1] > smpSWLon;

                        if (pointInsideOfScreen)
                        {
                            // Actually render the point...
                            pointToRender = true;

                            // Check if a polygon already exists
                            if (me.polygonCloud[i][g] != null) {
                                // Polygon exists
                                // But is the value different?
                                if (me.polygonCloud[i][g].value != pointValue) {
                                    // Update the polygon
                                    me.polygonCloud[i][g].setOptions({
                                        "fillColor": pointColor
                                    });
                                    me.polygonCloud[i][g].value = pointValue;

                                    ++recyclePolygonCount;
                                }

                                // if (me.polygonCloud[i][g].getMap() == null)
                                // {
                                //  me.polygonCloud[i][g].setMap(me.map);
                                // }
                            } else {
                                // A polygon doesn't exist here
                                // Get points and render polygon
                                var gOffset = g + gateDepthSize;
                                var iOffset = (i + gateWidthSize >= me.pointCloud.length) ? (i + gateWidthSize) % me.pointCloud.length : i + gateWidthSize;

                                var upPoint = me.pointCloud[i][gOffset];
                                var upRightPoint = me.pointCloud[iOffset][gOffset];
                                var rightPoint = me.pointCloud[iOffset][g];

                                // console.log(i, g, gOffset, iOffset);

                                var points = [point, upPoint, upRightPoint, rightPoint, point];

                                me.polygonCloud[i][g] = me.plotPolygon(points, pointValue, pointColor);

                                ++addPolygonCount;
                            }
                        }
                    }
                }
            }
            
            if (! pointToRender)
            {
                // Invalid value

                // Check if there is already polygon
                // If so, remove it
                // if (me.polygonCloud[i][g] != null) {
                //     me.polygonCloud[i][g].setMap(null);
                //     me.polygonCloud[i][g] = null;

                //     ++removePolygonCount;
                // }
                if (me.polygonCloud[i][g] != null) {
                    if (me.polygonCloud[i][g].value != me.TRANSPARENT_POLYGON_MAGIC_NUMBER)
                    {
                        me.polygonCloud[i][g].setOptions({
                            "fillColor": "transparent"
                        });
                        me.polygonCloud[i][g].value = me.TRANSPARENT_POLYGON_MAGIC_NUMBER;

                        ++removePolygonCount;
                    }
                }
            }

            // if(me.debugMode) break;
        }
    }

    me.renderDone = true;

    if (me.debugMode)
    {
        console.log("Polygons recycled: ", recyclePolygonCount);
        console.log("Polygons added: ", addPolygonCount);
        console.log("Polygons removed: ", removePolygonCount);

        var renderLatency = (new Date()).getTime() - startTime;
        console.log("Render latency: ", renderLatency);
    }
};

RadarRendererGoogleMaps.prototype.redraw = function() {
    var me = this;

    if(me.tower == null || me.sweep == null) return;

    if(me.sweep.values_count <= 7500)
    {
        var gateDepth = 1;
        var gateWidth = 1;

        return me.draw(gateDepth, gateWidth);
    }

    var mapZoomLevel = me.map.getZoom();

    if(me.debugMode)
    {
        console.log("Map zoom level: ", mapZoomLevel);
        // console.log(me.sweep.total_radial_gates, me.sweep.meters_between_gates, roundedMetersBetweenGates, me.sweep.gate_depth)
    }

    // Round the nearest 250
    var roundedMetersBetweenGates = Math.round(me.sweep.meters_between_gates / 250) * 250;

    var qualityTable = {
        "L2": {
            // context
            "default": {
                // quality level
                "1": {
                    // zoom level
                    "start": {
                        "depth": 16,
                        "width": 2
                    },
                    "8": {
                        "depth": 16,
                        "width": 2
                    },
                    "9": {
                        "depth": 12,
                        "width": 2
                    },
                    "10": {
                        "depth": 8,
                        "width": 2
                    },
                    "11": {
                        "depth": 4,
                        "width": 2
                    },
                    "12": {
                        "depth": 1,
                        "width": 1
                    }
                },
                "2": {
                    // zoom level
                    "start": {
                        "depth": 16,
                        "width": 2
                    },
                    "8": {
                        "depth": 12,
                        "width": 2
                    },
                    "9": {
                        "depth": 8,
                        "width": 2
                    },
                    "10": {
                        "depth": 6,
                        "width": 2
                    },
                    "11": {
                        "depth": 4,
                        "width": 2
                    },
                    "12": {
                        "depth": 1,
                        "width": 1
                    }
                },
                "3": {
                    // zoom level
                    "start": {
                        "depth": 12,
                        "width": 2
                    },
                    "8": {
                        "depth": 10,
                        "width": 2
                    },
                    "9": {
                        "depth": 8,
                        "width": 2
                    },
                    "10": {
                        "depth": 6,
                        "width": 2
                    },
                    "11": {
                        "depth": 4,
                        "width": 1
                    },
                    "12": {
                        "depth": 1,
                        "width": 1
                    }
                },
                "4": {
                    // zoom level
                    "start": {
                        "depth": 10,
                        "width": 2
                    },
                    "8": {
                        "depth": 8,
                        "width": 2
                    },
                    "9": {
                        "depth": 6,
                        "width": 2
                    },
                    "10": {
                        "depth": 4,
                        "width": 2
                    },
                    "11": {
                        "depth": 2,
                        "width": 1
                    },
                    "12": {
                        "depth": 1,
                        "width": 1
                    }
                },
                "5": {
                    // zoom level
                    "start": {
                        "depth": 8,
                        "width": 2
                    },
                    "8": {
                        "depth": 6,
                        "width": 2
                    },
                    "9": {
                        "depth": 4,
                        "width": 2
                    },
                    "10": {
                        "depth": 2,
                        "width": 1
                    },
                    "11": {
                        "depth": 1,
                        "width": 1
                    },
                    "12": {
                        "depth": 1,
                        "width": 1
                    }
                }
            },
            "iphone": {
                // quality level
                "1": {
                    // zoom level
                    "start": {
                        "depth": 16,
                        "width": 2
                    },
                    "8": {
                        "depth": 16,
                        "width": 2
                    },
                    "9": {
                        "depth": 12,
                        "width": 2
                    },
                    "10": {
                        "depth": 8,
                        "width": 2
                    },
                    "11": {
                        "depth": 4,
                        "width": 2
                    },
                    "12": {
                        "depth": 4,
                        "width": 1
                    }
                },
                "2": {
                    // zoom level
                    "start": {
                        "depth": 12,
                        "width": 2
                    },
                    "8": {
                        "depth": 12,
                        "width": 2
                    },
                    "9": {
                        "depth": 10,
                        "width": 2
                    },
                    "10": {
                        "depth": 6,
                        "width": 2
                    },
                    "11": {
                        "depth": 4,
                        "width": 2
                    },
                    "12": {
                        "depth": 2,
                        "width": 1
                    }
                },
                "3": {
                    // zoom level
                    "start": {
                        "depth": 12,
                        "width": 2
                    },
                    "8": {
                        "depth": 12,
                        "width": 2
                    },
                    "9": {
                        "depth": 8,
                        "width": 2
                    },
                    "10": {
                        "depth": 6,
                        "width": 2
                    },
                    "11": {
                        "depth": 4,
                        "width": 2
                    },
                    "12": {
                        "depth": 2,
                        "width": 1
                    }
                },
                "4": {
                    // zoom level
                    "start": {
                        "depth": 10,
                        "width": 2
                    },
                    "8": {
                        "depth": 10,
                        "width": 2
                    },
                    "9": {
                        "depth": 8,
                        "width": 2
                    },
                    "10": {
                        "depth": 4,
                        "width": 2
                    },
                    "11": {
                        "depth": 2,
                        "width": 1
                    },
                    "12": {
                        "depth": 1,
                        "width": 1
                    }
                },
                "5": {
                    // zoom level
                    "start": {
                        "depth": 10,
                        "width": 2
                    },
                    "8": {
                        "depth": 10,
                        "width": 2
                    },
                    "9": {
                        "depth": 8,
                        "width": 1
                    },
                    "10": {
                        "depth": 4,
                        "width": 1
                    },
                    "11": {
                        "depth": 2,
                        "width": 1
                    },
                    "12": {
                        "depth": 1,
                        "width": 1
                    }
                }
            }
        }
    };

    if(me.sweep.total_radial_gates <= 360)
    {
        console.log("zoom", me.map.getZoom())
        console.log("L3 product", roundedMetersBetweenGates);

        var gateDepth = 1000 / roundedMetersBetweenGates;
        var gateWidth = 1;
        if(mapZoomLevel <= 8)
        {
            gateDepth*=2;
        }
        if(mapZoomLevel <= 7)
        {
            // gateDepth*=3;
        }

        if(me.debugMode)
        {
            console.log("gate depth", gateDepth, "gate width", gateWidth);
        }

        return me.draw(gateDepth, gateWidth);
    }
    else if(me.sweep.total_radial_gates <= 720)
    {
        // console.log("L2 product");

        var gateDepth = 4;
        var gateWidth = 1;

        if(roundedMetersBetweenGates == 250)
        {
            var ctx = "default";
            var level = this.renderQualityLevel;

            console.log("Quality level: ", level);

            if(platform.product != null)
            {
                var platformProduct = platform.product.toLowerCase();
                if(qualityTable["L2"][platformProduct] != undefined)
                {
                    ctx = platformProduct;
                }
            }

            var qualityConfig = qualityTable["L2"][ctx][level];

            gateDepth = qualityConfig["start"]["depth"];
            gateWidth = qualityConfig["start"]["width"];

            if(mapZoomLevel == 8 || mapZoomLevel == 9 || mapZoomLevel == 10 || mapZoomLevel == 11)
            {
                gateDepth = qualityConfig[mapZoomLevel]["depth"];
                gateWidth = qualityConfig[mapZoomLevel]["width"];
            }
            else if(mapZoomLevel >= 12)
            {
                gateDepth = qualityConfig[(mapZoomLevel > 12) ? 12 : 12]["depth"];
                gateWidth = qualityConfig[(mapZoomLevel > 12) ? 12 : 12]["width"];
            }
        }

        if(me.debugMode)
        {
            console.log("gate depth", gateDepth, "gate width", gateWidth);
        }

        return me.draw(gateDepth, gateWidth);
    }
};

RadarRendererGoogleMaps.prototype.remove = function() {
    var me = this;

    if (me.sweepRadialCircle != null) {
        me.sweepRadialCircle.setMap(null);
        me.sweepRadialCircle = null;
    }
};

RadarRendererGoogleMaps.prototype.degrees2Radians = function(degrees) {
    return degrees * Math.PI / 180;
};

RadarRendererGoogleMaps.prototype.radians2Degrees = function(radians) {
    return radians * 180 / Math.PI;
};

RadarRendererGoogleMaps.prototype.moveGps = function(lat, lon, distanceMetres, bearing) {
    var me = this;
    var R = 6378.1;
    var brng = me.degrees2Radians(bearing);
    var d = distanceMetres / 1000.0;

    var lat1 = me.degrees2Radians(lat)
    var lon1 = me.degrees2Radians(lon)

    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) +
        Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng))

    var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
        Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2))

    return [me.radians2Degrees(lat2), me.radians2Degrees(lon2)];
};

RadarRendererGoogleMaps.prototype.getPointCloudForSweep = function(tower, sweep) {
    var me = this;

    var allPoints = [];

    var i, g;
    var row;
    var degrees;
    var distance;
    var point;

    var gateAzimuthal = 360 / sweep.total_radial_gates;

    for (i = 0; i < sweep.total_radial_gates; i += 1) {
        row = [];
        for (g = 0; g < sweep.gate_depth; g += 1) {
            degrees = (sweep.azimuth_offset + (i * gateAzimuthal)) % 360;
            distance = sweep.meters_to_first_gate + (g * sweep.meters_between_gates);

            // console.log(i, g, degrees, distance)

            point = me.moveGps(tower.lat, tower.lon, distance, degrees);

            row.push(point);

            // if(g == 1) break;
        }

        allPoints.push(row);
    }

    return allPoints;
};

RadarRendererGoogleMaps.prototype.getEmptyPolygonCloud = function(sweep) {
    var degrees = [];

    var d, row, r;

    for (d = 0; d < sweep.total_radial_gates; ++d) {
        row = [];

        for (r = 0; r < sweep.gate_depth; ++r) {
            row.push(null);
        }

        degrees.push(row);
    }

    return degrees;
};

RadarRendererGoogleMaps.prototype.plotPolygon = function(coords, value, color) {
    var me = this;

    var fillOpacity = me.opacity;

    var p = new google.maps.Polygon({
        paths: coords.map(function(coord) {
            return {
                lat: coord[0],
                lng: coord[1]
            };
        }),
        strokeColor: color,
        strokeOpacity: 1,
        strokeWeight: 0,
        fillColor: color,
        fillOpacity: fillOpacity,
        fillOpacityDefault: fillOpacity,
        map: me.map,
        value: value,
        zIndex: 1
    });

    google.maps.event.addListener(p, 'click', function(event) {
        if (p == null || p.value == me.TRANSPARENT_POLYGON_MAGIC_NUMBER || me.sweep == null) return;

        if (typeof(me.onPolygonClick) == "function") me.onPolygonClick(event, p, p.value, me.sweep.value.unit, p.fillColor)
    });

    google.maps.event.addListener(p, "mouseover", function(event) {
        if (p == null || p.value == me.TRANSPARENT_POLYGON_MAGIC_NUMBER || me.sweep == null) return;

        if (typeof(me.onPolygonMouseover) == "function")  me.onPolygonMouseover(event, p, p.value, me.sweep.value.unit, p.fillColor)
    });

    google.maps.event.addListener(p, "mouseout", function(event) {
        if (p == null || p.value == me.TRANSPARENT_POLYGON_MAGIC_NUMBER || me.sweep == null) return;
        
        if (typeof(me.onPolygonMouseout) == "function")  me.onPolygonMouseout(event, p, p.value, me.sweep.value.unit, p.fillColor)
    });

    return p;
};

RadarRendererGoogleMaps.prototype.paddedBounds = function(bounds, npad, spad, epad, wpad) {
    var me = this;

    var SW = bounds.getSouthWest();
    var NE = bounds.getNorthEast();
    var topRight = me.map.getProjection().fromLatLngToPoint(NE);
    var bottomLeft = me.map.getProjection().fromLatLngToPoint(SW);
    var scale = Math.pow(2, me.map.getZoom());

    var SWtopoint = me.map.getProjection().fromLatLngToPoint(SW);
    var SWpoint = new google.maps.Point(((SWtopoint.x - bottomLeft.x) * scale) + wpad, ((SWtopoint.y - topRight.y) * scale) - spad);
    var SWworld = new google.maps.Point(SWpoint.x / scale + bottomLeft.x, SWpoint.y / scale + topRight.y);
    var pt1 = me.map.getProjection().fromPointToLatLng(SWworld);

    var NEtopoint = me.map.getProjection().fromLatLngToPoint(NE);
    var NEpoint = new google.maps.Point(((NEtopoint.x - bottomLeft.x) * scale) - epad, ((NEtopoint.y - topRight.y) * scale) + npad);
    var NEworld = new google.maps.Point(NEpoint.x / scale + bottomLeft.x, NEpoint.y / scale + topRight.y);
    var pt2 = me.map.getProjection().fromPointToLatLng(NEworld);

    return new google.maps.LatLngBounds(pt1, pt2);
}

RadarRendererGoogleMaps.prototype.setOnPolygonClick = function(fn) {
    this.onPolygonClick = fn;

    return this;
};

RadarRendererGoogleMaps.prototype.setOnPolygonMouseover = function(fn) {
    this.onPolygonMouseover = fn;

    return this;
};

RadarRendererGoogleMaps.prototype.setOnPolygonMouseout = function(fn) {
    this.onPolygonMouseout = fn;

    return this;
};

RadarRendererGoogleMaps.prototype.setOnSweepValueMinMaxChange = function(fn) {
    this.onSweepValueMinMaxChange = fn;

    return this;
};

RadarRendererGoogleMaps.prototype.setSweepMinValue = function(v) {
    this.sweepMinValue = v;

    return this;
};

RadarRendererGoogleMaps.prototype.setSweepMaxValue = function(v) {
    this.sweepMaxValue = v;

    return this;
};

RadarRendererGoogleMaps.prototype.setSweepMinMaxValue = function(min, max) {
    this.setSweepMinValue(min);
    this.setSweepMaxValue(max);

    return this;
};

RadarRendererGoogleMaps.prototype.setQualityLevel = function(level) {
    this.renderQualityLevel = level;

    return this;
};

RadarRendererGoogleMaps.prototype.setOpacity = function(opacity) {
    var me = this;

    me.opacity = opacity;

    if(me.tower == null || me.sweep == null || me.polygonCloud == null) return;

    for(var r = 0; r < me.polygonCloud.length; ++r)
    {
        for(var g = 0; g < me.polygonCloud[r].length; ++g)
        {
            if (me.polygonCloud[r][g] != null)
            {
                me.polygonCloud[r][g].fillOpacityDefault = opacity;
                me.polygonCloud[r][g].setOptions({
                    "fillOpacity": opacity
                });
            }
        }
    }

    return this;
};

RadarRendererGoogleMaps.prototype.reColor = function() {
    var me = this;

    if(me.tower == null || me.sweep == null || me.polygonCloud == null) return;

    for(var r = 0; r < me.polygonCloud.length; ++r)
    {
        for(var g = 0; g < me.polygonCloud[r].length; ++g)
        {
            if (me.polygonCloud[r][g] != null)
            {
                var pointValue = me.polygonCloud[r][g].value;

                if (pointValue != me.TRANSPARENT_POLYGON_MAGIC_NUMBER)
                {
                    var pointColor = me.getColorFromTable(pointValue, me.sweep.value.min, me.sweep.value.max);

                    me.polygonCloud[r][g].setOptions({
                        "fillColor": pointColor
                    });
                }
            }
        }
    }
}

RadarRendererGoogleMaps.prototype.loadSweeps = function(urls, progressBar, doneCb) {
    if(urls.length == 0)
    {
        doneCb && doneCb();
        return;
    }

    var dataPreloader = function(dataArray, eachDoneCb, allDoneCb) {
        var loadedImages = 0;
        var downloadTasks = [];

        dataArray.forEach(function(dataItem){
            downloadTasks.push(function(cb){
                $.getJSON(dataItem)
                .done(function(data){
                    eachDoneCb && eachDoneCb(loadedImages);

                    cb(null, data)

                    ++loadedImages;
                })
                .fail(function( e ){
                    eachDoneCb && eachDoneCb(loadedImages);

                    console.error(e)

                    cb(e);

                    ++loadedImages;
                });
            });
        });

        async.parallelLimit(downloadTasks, 8, function(err, results){
            allDoneCb && allDoneCb(results);
        });
    };

    progressBar.show();
    progressBar.progress(100.0 / urls.length);
    dataPreloader(urls, function(count){
        // console.log(count, ((count+1) / urls.length) * 100);

        progressBar.progress(((count+1) / urls.length) * 100);
    }, function(results){
        progressBar.hide();

        doneCb && doneCb(results);
    });
};

RadarRendererGoogleMaps.prototype.hasRendered = function(){
    return this.renderDone;
};


