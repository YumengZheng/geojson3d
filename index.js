var THREE = require('three');
var d3 = require('d3');
var topojson = require('topojson');
var geo = require('./geo');
THREE.TrackballControls = require('three-trackballcontrols');
var earcut = require('earcut');

var defaultWidth = 640;
var defaultHeight = 480;

var materials = {
    phong: function(color) {
        return new THREE.MeshPhongMaterial(
            { 
                color: color,
                specular: 0x000000,
                shininess: 60,
                shading: THREE.SmoothShading,
                transparent:true  
            }
        )
    },
    meshLambert: function(color) {
        return new THREE.MeshLambertMaterial({
        color: color,
        specular: 0x009900,
        shininess: 30,
        shading: THREE.SmoothShading,
        transparent:true
        });
    },
    meshWireFrame: function(color) {
        return new THREE.MeshBasicMaterial({
            color: color,
        specular: 0x009900,
        shininess: 30,
        shading: THREE.SmoothShading,
        wireframe:true,
        transparent:true
        });
    },
    meshBasic: function(color) {
        return new THREE.MeshBasicMaterial({
        color: color,
        specular: 0x009900,
        shininess: 30,
        shading: THREE.SmoothShading,
        transparent: true
        });
    }
};

var randomFunctions = {
    color: function(d) {
        return Math.random() * 16777216;
    },

    height: function(d) {
        return Math.random() * 20;
    }
};

var material = 'phong';

function onWindowResize(container, sceneObj) {
    sceneObj.camera.aspect = container.clientWidth / container.clientHeight;
    sceneObj.camera.updateProjectionMatrix();
    sceneObj.renderer.setSize(container.clientWidth, container.clientHeight);
    sceneObj.controls.handleResize();
    sceneObj.renderer.render(sceneObj.scene, sceneObj.camera);
}

function animate(sceneObj) {
    requestAnimationFrame(
        () => animate(sceneObj));
    sceneObj.controls.update();
}

function clearGroups(json, sceneObj) {
    if (json) {
        if (json.type === 'FeatureCollection') {
            json.features.forEach(
                function(feature) {
                    sceneObj.scene.remove(feature._group);
                }
            );
        } else if (json.type === 'Topology') {
            Object.keys(json.objects).forEach(
                function(key) {
                    json.objects[key].geometries.forEach(
                        function(object) {
                            sceneObj.scene.remove(object._group);
                        }
                    );
                }
            );
        }
    }
    sceneObj.renderer.render(
        sceneObj.scene,
        sceneObj.camera
    );
}

/**
 * Use triangulation from earcut. The default triangulation
 * causes holes to appear in the drawn maps.
 */
THREE.ShapeUtils.triangulateShape = function ( contour, holes ) {
    var i, il, dim = 2, array;
    var holeIndices = [];
    var points = [];

    addPoints( contour );

    for ( i = 0, il = holes.length; i < il; i ++ ) {
        holeIndices.push( points.length / dim );
        addPoints( holes[ i ] );
    }
    
    try {
        array = earcut(points, holeIndices, dim);
    } catch (err) {
        console.warn(err)
    }

    var result = [];

    for ( i = 0, il = array.length; i < il; i += 3 ) {
        result.push(
            array.slice(i, i + 3));
    }

    return result;

    function addPoints( a ) {
        var i, il = a.length;
        for ( i = 0; i < il; i ++ ) {
            points.push( a[ i ].x, a[ i ].y );
        }

    }

}

/**
 * Add a shape to the scene.
 * @param {*} group 
 * @param {*} shape 
 * @param {*} extrudeSettings 
 * @param {*} material 
 * @param {*} color 
 * @param {*} x 
 * @param {*} y 
 * @param {*} z 
 * @param {*} rx 
 * @param {*} ry 
 * @param {*} rz 
 * @param {*} s 
 */
function addShape(group, shape, extrudeSettings, material, color, x, y, z, rx, ry, rz, s) {
    try{
        var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        var mesh = new THREE.Mesh(geometry, materials[material](color));

        // Add shadows
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, rz);
        mesh.scale.set(s, s, s);
        group.add(mesh);
    } catch (err) {
        console.warn(err);
    }
}

/**
 * A feature is a unit of a FeatureCollection. Converts
 * a feature to the appropriate three.js object and adds it to the scene.
 * @param {*} sceneObj 
 * @param {*} feature 
 * @param {*} projection 
 * @param {*} functions 
 */
function addFeature(sceneObj, feature, projection, functions=randomFunctions) {
    var group = new THREE.Group();
    sceneObj.scene.add(group);

    var color;
    var amount;

    try {
        if(feature.color){
            color = feature.color
        } else {
            color = functions.color(feature.properties);
        }
    } catch(err) {
        console.log(err);
    }

    try {
        if(feature.height){
            amount = feature.height
            console.log('a',feature.height)
        } else {
            amount = functions.height(feature.properties);
        }
    } catch(err) {
        console.log(err);
    }

    var extrudeSettings = {
        amount: amount,
        bevelEnabled: false
    };

    var material = 'phong';

    if (feature.geometry.type === 'Polygon') {
        var shape = geo.createPolygonShape(feature.geometry.coordinates, projection);
        addShape(group, shape, extrudeSettings, material, color, 0, 0, amount, Math.PI, 0, 0, 1);
    } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach(function(polygon) {
        var shape = geo.createPolygonShape(polygon, projection);
        addShape(group, shape, extrudeSettings, material, color, 0, 0, amount, Math.PI, 0, 0, 1);
        });
    } else {
        console.err('This tutorial only renders Polygons and MultiPolygons')
    }

    return group;
}
//aaa

function draw(json_url, user_url, container, sceneObj, projectionStr, functions, preprojected=false) {

    var width = container.clientWidth;
    var height = container.clientHeight;
    d3.csv(user_url, function(err, rows){
        const userData = rows
        // console.log(rows)
        d3.json(json_url, function(data) {
            clearGroups(data, sceneObj);
    
            if (data.type === 'FeatureCollection') {
                console.log('aaaa')
                drawFeatureCollection(userData, data, width, height, functions, sceneObj, projectionStr, preprojected);
            } else if (data.type === 'Topology') {
                drawTopology(userData, data, width, height, functions, sceneObj, projectionStr, preprojected);
            } else {
                console.err('Only TopoJSON and GeoJSON FeatureCollections are supported');
            }
    
            sceneObj.renderer.render(sceneObj.scene, sceneObj.camera);
        });
    })
}

function drawFeatureCollection(userData, data, width, height, functions, sceneObj, projectionStr, preprojected) {
    console.log('1', userData)
    var projection = null;
    if (isFunction(projectionStr)) {
        projection = projectionStr;
    } else {
        if (!preprojected) {
            projection = geo.getProjection(data, width, height, projectionStr);
        }
    }
    data.features.forEach(function(feature) {
        userData.forEach((n)=>{
            if(n.NAME === feature.properties.NAME){
                if(n.height!==undefined){
                    feature.height = n.height
                }
                if(n.color!==undefined){
                    feature.color = n.color
                } 
            }
        })
        var group = addFeature(sceneObj, feature, projection, functions);
        feature._group = group;
    });
}

function drawTopology(userData, data, width, height, functions, sceneObj, projectionStr, preprojected) {
    console.log('2', userData)
    var geojson = topojson.feature(data, data.objects[Object.keys(data.objects)[0]]);

    // if not preprojected, compute a projection
    var projection = null;
    if (isFunction(projectionStr)) {
        projection = projectionStr;
    } else {
        if (!preprojected) {
            projection = geo.getProjection(geojson, width, height, projectionStr);
        }
    }

    Object.keys(data.objects).forEach(function(key) {
        data.objects[key].geometries.forEach(function(object) {
            var feature = topojson.feature(data, object);
            userData.forEach((n)=>{
                if(feature.id === n.id){
                    feature.height = n.height
                    console.log(feature)
                if(n.color!==undefined){
                    feature.color = n.color
                } 
            }
        })
            var group = addFeature(sceneObj, feature, projection, functions);
            object._group = group;
        });
    });
}

var initScene = function (container, json_location, width=640, height=480) {

    var camera, controls, scene, renderer;
    var light, spotLight, ambientLight;
    var cross;

    container.style.width = String(width) + "px";
    if (Number.isInteger(height)) {
        container.style.height = String(height) + "px";
    }

    camera = new THREE.PerspectiveCamera( 70, container.clientWidth / container.clientHeight, 0.1, 10000);
    camera.position.z = Math.min(container.clientWidth, container.clientHeight);
    controls = new THREE.TrackballControls(camera, container);
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    controls.keys = [65, 83, 68];

    // World
    scene = new THREE.Scene();

    // Lights
    light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1);
    scene.add(light);

    spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(-1000, -1000, 1000);
    spotLight.castShadow = true;
    scene.add(spotLight);

    ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    // Renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Shadows
    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;
    renderer.shadowCameraNear = 1;
    renderer.shadowCameraFar = camera.far;
    renderer.shadowCameraFov = 60;
    renderer.shadowMapBias = 0.0025;
    renderer.shadowMapDarkness = 0.5;
    renderer.shadowMapWidth = 1024;
    renderer.shadowMapHeight = 1024;

    var sceneObj = {
        camera: camera,
        controls: controls,
        scene: scene,
        renderer: renderer,
        light: light,
        spotLight: spotLight,
        ambientLight: ambientLight,
        cross: cross
    };

    controls.addEventListener(
        'change',
        function () {
            sceneObj.renderer.render(sceneObj.scene, sceneObj.camera);
        }
    );


    window.addEventListener(
        'resize',
        function(ev) {
            onWindowResize(container, sceneObj);
        },
        false
    );

    onWindowResize(container, sceneObj);
    renderer.render(scene, camera);

    return sceneObj
}

var isFunction = function(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

var plot = function(container,{json_location = undefined,
                                user_url = undefined,
                                width = undefined,
                                height = undefined,
                                projection=undefined,
                                functions=undefined,
                                preprojected=false,
                                url= undefined,
                                type = "Topology",
                                stateorCounty = undefined }) {
    var sceneObj = initScene(
        container,
        json_location,
        width,
        height
    );

    draw(json_location, user_url, container, sceneObj, projection, functions, preprojected);
    animate(sceneObj);
}

exports.plot = plot;
exports.projections = geo.projections;
exports.randomFunctions = randomFunctions;