"use strict"

// set up SVG for D3
var width  = 480,
height = 500,
colors = d3.scale.category10();

var svg = d3.select('#graph')
.append('svg')
.attr('width', width)
.attr('height', height);
var points = [];

// set up initial nodes and links
//  - nodes are known by 'id', not by index in array.
//  - reflexive edges are indicated on the node (as a bold black circle).
//  - links are always source < target; edge directions are set by 'left' and 'right'.
var nodes = [
  // {
  //   id: 0,
  //   reflexive: false,
  //   membership_functions: [{
  //     title: "Something else",
  //     points: [{x: 1, y: 25}, {x: 0, y: 0}, {x: 10, y: 0}, {x: 20, y: 25}, {x: 22, y: 12}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 50,
  //     yMin: 0,
  //     yMax: 50,
  //   },
  //   {
  //     title: "Something 1",
  //     points: [{x: 10, y: 140}, {x: 30, y: 0}, {x: 140, y: 0}, {x: 200, y: 150}, {x: 125, y: 125}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 250,
  //     yMin: 0,
  //     yMax: 300,
  //   }
  //   ]
  // },
  // {
  //   id: 1,
  //   reflexive: false,
  //   membership_functions: [{
  //     title: "Something 2",
  //     points: [{x: 10, y: 250}, {x: 0, y: 0}, {x: 100, y: 0}, {x: 200, y: 250}, {x: 225, y: 125}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 250,
  //     yMin: 0,
  //     yMax: 300,
  //   },
  //   {
  //     title: "Something 3",
  //     points: [{x: 10, y: 250}, {x: 0, y: 0}, {x: 100, y: 0}, {x: 200, y: 250}, {x: 225, y: 125}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 250,
  //     yMin: 0,
  //     yMax: 300,
  //   }
  //   ]
  // },
  // {
  //   id: 2,
  //   reflexive: false,
  //   membership_functions: [{
  //     title: "Something 4",
  //     points: [{x: 10, y: 250}, {x: 0, y: 0}, {x: 100, y: 0}, {x: 200, y: 250}, {x: 225, y: 125}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 250,
  //     yMin: 0,
  //     yMax: 300,
  //   },
  //   {
  //     title: "Something 5",
  //     points: [{x: 10, y: 250}, {x: 0, y: 0}, {x: 100, y: 0}, {x: 200, y: 250}, {x: 225, y: 125}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 250,
  //     yMin: 0,
  //     yMax: 300,
  //   }
  //   ]
  // }
],
  lastNodeId = -1,//2,
  links = [
    // {source: nodes[0], target: nodes[1], left: false, right: true },
    // {source: nodes[1], target: nodes[2], left: false, right: true }
];

// Retrieve the object from storage
var retrievedObject = localStorage.getItem('lastSessionData');
if(retrievedObject !== null) {
  var lastData = JSON.parse(retrievedObject);

  nodes = lastData.nodes;
  links = lastData.links;

  for(var i = 0; i < links.length; i++){
    links[i].source = nodes[links[i].source.id];
    links[i].target = nodes[links[i].target.id]
  }

  lastNodeId = Number(lastData.last);
  //localStorage.setItem('lastSessionData', JSON.stringify({nodes: nodes, links: links, last: last_node_id}));
}

// init D3 force layout
var force = d3.layout.force()
.nodes(nodes)
.links(links)
.size([width, height])
.linkDistance(150)
.charge(-500)
.on('tick', tick)

// define arrow markers for graph links
svg.append('svg:defs').append('svg:marker')
.attr('id', 'end-arrow')
.attr('viewBox', '0 -5 10 10')
.attr('refX', 6)
.attr('markerWidth', 3)
.attr('markerHeight', 3)
.attr('orient', 'auto')
.append('svg:path')
.attr('d', 'M0,-5L10,0L0,5')
.attr('fill', '#000');

svg.append('svg:defs').append('svg:marker')
.attr('id', 'start-arrow')
.attr('viewBox', '0 -5 10 10')
.attr('refX', 4)
.attr('markerWidth', 3)
.attr('markerHeight', 3)
.attr('orient', 'auto')
.append('svg:path')
.attr('d', 'M10,-5L0,0L10,5')
.attr('fill', '#000');

// line displayed when dragging new nodes
var drag_line = svg.append('svg:path')
.attr('class', 'link dragline hidden')
.attr('d', 'M0,0L0,0');

// handles to link and node element groups
var path = svg.append('svg:g').selectAll('path'),
circle = svg.append('svg:g').selectAll('g');

// mouse event vars
var selected_node = null,
selected_link = null,
mousedown_link = null,
mousedown_node = null,
mouseup_node = null,
current_function = 0;

function resetMouseVars() {
    mousedown_node = null;
    mouseup_node = null;
    mousedown_link = null;
}

// update force layout (called automatically each iteration)
function tick() {
    // draw directed edges with proper padding from node centers
    path.attr('d', function(d) {
        var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = d.left ? 17 : 12,
        targetPadding = d.right ? 17 : 12,
        sourceX = d.source.x + (sourcePadding * normX),
        sourceY = d.source.y + (sourcePadding * normY),
        targetX = d.target.x - (targetPadding * normX),
        targetY = d.target.y - (targetPadding * normY);
        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
    });

    circle.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
    });
}

// update graph (called when needed)
function restart() {
    // path (link) group
    path = path.data(links);

    // update existing links
    path.classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });


    // add new links
    path.enter().append('svg:path')
    .attr('class', 'link')
    .classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
    .on('mousedown', function(d) {
        if(d3.event.ctrlKey) return;

        // select link
        mousedown_link = d;
        if(mousedown_link === selected_link) selected_link = null;
        else selected_link = mousedown_link;
        //STOP THE SELECTED NODE BECOMING UNSELECTED
        //selected_node = null;
        restart();
    });

    // remove old links
    path.exit().remove();


    // circle (node) group
    // NB: the function arg is crucial here! nodes are known by id, not by index!
    circle = circle.data(nodes, function(d) { return d.id; });

    // update existing nodes (reflexive & selected visual states)
    circle.selectAll('circle')
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .classed('reflexive', function(d) { return d.reflexive; });

    // add new nodes
    var g = circle.enter().append('svg:g');

    g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', 12)
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .style('stroke', function(d) { return d3.rgb(colors(d.id)).darker().toString(); })
    .classed('reflexive', function(d) { return d.reflexive; })
    .on('mouseover', function(d) {
        if(!mousedown_node || d === mousedown_node) return;
        // enlarge target node
        d3.select(this).attr('transform', 'scale(1.1)');
    })
    .on('mouseout', function(d) {
        if(!mousedown_node || d === mousedown_node) return;
        // unenlarge target node
        d3.select(this).attr('transform', '');
    })
    .on('mousedown', function(d) {
        if(d3.event.ctrlKey) return;

        // select node
        mousedown_node = d;
        if(mousedown_node === selected_node) selected_node = null; //STOP THIS
        else selected_node = mousedown_node;
        selected_link = null;

        // reposition drag line
        drag_line
        .style('marker-end', 'url(#end-arrow)')
        .classed('hidden', false)
        .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

        restart();
    })
    .on('mouseup', function(d) {
        if(!mousedown_node) return;

        // needed by FF
        drag_line
        .classed('hidden', true)
        .style('marker-end', '');

        // check for drag-to-self
        mouseup_node = d;
        if(mouseup_node === mousedown_node) { resetMouseVars(); return; }

            // unenlarge target node
            d3.select(this).attr('transform', '');

            // add link to graph (update if exists)
            // NB: links are strictly source < target; arrows separately specified by booleans
            var source, target, direction;
            if(mousedown_node.id < mouseup_node.id) {
                source = mousedown_node;
                target = mouseup_node;
                direction = 'right';
            } else {
                source = mouseup_node;
                target = mousedown_node;
                direction = 'left';
            }

            var link;
            link = links.filter(function(l) {
                return (l.source === source && l.target === target);
            })[0];

            if(link) {
                link[direction] = true;
            } else {
                link = {source: source, target: target, left: false, right: false};
                link[direction] = true;
                links.push(link);
            }

            // select new link
            selected_link = link;
            //selected_node = null;
            restart();
        });

        // show node IDs
        g.append('svg:text')
        .attr('x', 0)
        .attr('y', 4)
        .attr('class', 'id')
        .text(function(d) { return d.id; });

        // remove old nodes
        circle.exit().remove();

        // set the graph in motion
        force.start();
    }

    function mousedown() {
        // prevent I-bar on drag
        //d3.event.preventDefault();

        // because :active only works in WebKit?
        svg.classed('active', true);

        if(d3.event.ctrlKey || mousedown_link) return;

        if(mousedown_node){

          current_function = 0;

          drawCurves();
          return;
        }

        // insert new node at point
        var point = d3.mouse(this),
        node = {id: ++lastNodeId, reflexive: false, membership_functions: []};
        node.x = point[0];
        node.y = point[1];
        nodes.push(node);

        restart();
    }

    function mousemove() {
        if(!mousedown_node) return;

        // update drag line
        drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

        restart();
    }

    function mouseup() {
        if(mousedown_node) {
            // hide drag line
            drag_line
            .classed('hidden', true)
            .style('marker-end', '');
        }

        // because :active only works in WebKit?
        svg.classed('active', false);

        // clear mouse event vars
        resetMouseVars();
    }

    function spliceLinksForNode(node) {
        var toSplice = links.filter(function(l) {
            return (l.source === node || l.target === node);
        });
        toSplice.map(function(l) {
            links.splice(links.indexOf(l), 1);
        });
    }

    // only respond once per keydown
    var lastKeyDown = -1;

    function keydown() {
        // d3.event.preventDefault();
        //
        // if(lastKeyDown !== -1) return;
        // lastKeyDown = d3.event.keyCode;
        //
        // // ctrl
        // if(d3.event.keyCode === 17) {
        //     circle.call(force.drag);
        //     svg.classed('ctrl', true);
        // }
        //
        // if(!selected_node && !selected_link) return;
        // switch(d3.event.keyCode) {
        //     case 8: // backspace
        //     case 46: // delete
        //     if(selected_node) {
        //         nodes.splice(nodes.indexOf(selected_node), 1);
        //         spliceLinksForNode(selected_node);
        //     } else if(selected_link) {
        //         links.splice(links.indexOf(selected_link), 1);
        //     }
        //     selected_link = null;
        //     selected_node = null;
        //     restart();
        //     break;
        //     case 66: // B
        //     if(selected_link) {
        //         // set link direction to both left and right
        //         selected_link.left = true;
        //         selected_link.right = true;
        //     }
        //     restart();
        //     break;
        //     case 76: // L
        //     if(selected_link) {
        //         // set link direction to left only
        //         selected_link.left = true;
        //         selected_link.right = false;
        //     }
        //     restart();
        //     break;
        //     case 82: // R
        //     if(selected_node) {
        //         // toggle node reflexivity
        //         selected_node.reflexive = !selected_node.reflexive;
        //     } else if(selected_link) {
        //         // set link direction to right only
        //         selected_link.left = false;
        //         selected_link.right = true;
        //     }
        //     restart();
        //     break;
        // }
    }

    function keyup() {
        // lastKeyDown = -1;
        //
        // // ctrl
        // if(d3.event.keyCode === 17) {
        //     circle
        //     .on('mousedown.drag', null)
        //     .on('touchstart.drag', null);
        //     svg.classed('ctrl', false);
        // }
    }

    function drawCurves(){
      fillForm();
      var ul = d3.select("#mf-list");
      ul.selectAll("li").remove();
      d3.select("#vis").selectAll("svg").remove();
      selected_node.membership_functions.forEach(function(points, i){
        // add a button with the number for each mf
        //<button class="btn btn-default">Button</button>
        var li = ul.append("li")
        .append("button")
        .attr("class", "btn btn-default")
        .text(i + 1);

        //The mf is the selected one
        if(i === current_function){
          // Draw the function

          li.attr("class", "btn btn-success");
          //var id = "curve" + i;

          var id = "myCurve";
          d3.select("#vis")
          .append("div")
          .attr("id", id);

          bezier(selected_node.membership_functions[i], id);
        }

        $('#mf-list li button').click(function(){
          current_function = $(this).text() - 1;
          drawCurves();
        });
      });
    }

    function fillForm(){
      if(selected_node.membership_functions.length > 0){
        var memFunc = selected_node.membership_functions[current_function];
        $('#titleField').val(memFunc.title);
        $('#xAxisField').val(memFunc.xLabel);
        $('#yAxisField').val(memFunc.yLabel);
        $('#xMinField').val(memFunc.xMin);
        $('#xMaxField').val(memFunc.xMax);
        $('#yMinField').val(memFunc.yMin);
        $('#yMaxField').val(memFunc.yMax);
      }
    }

    // app starts here
    svg.on('mousedown', mousedown)
    .on('mousemove', mousemove)
    .on('mouseup', mouseup);
    d3.select(window)
    .on('keydown', keydown)
    .on('keyup', keyup);
    restart();

/////////////////////

function bezier(memfunc, id){

  var w = 500,
  h = 300,
  t = 1,
  delta = .01,
  padding = 30,
  points = memfunc.points,
  bezier = {},
  line = d3.svg.line().x(x).y(y),
  n = 4,
  stroke = d3.scale.category20b(),
  orders = d3.range(2, n + 2);

  var vis = d3.select('#'+id).selectAll("svg")
  .data([5])
  .enter().append("svg")
  .attr("width", w + 2 * padding)
  .attr("height", h + 2 * padding)
  .append("g")
  .attr("transform", "translate(" + padding + "," + padding + ")");

  // vis.append("text")
  // .attr("x", (w / 2))
  // .attr("y", padding)
  // .attr("text-anchor", "middle")
  // .style("font-size", "16px")
  // .style("text-decoration", "underline")
  // .text(memfunc.title);
  //
  var xScale = d3.scale.linear()
                  .domain([memfunc.xMin, memfunc.xMax])
                  .range([0, w - 2*padding]);

  var yScale = d3.scale.linear()
                  .domain([memfunc.yMin, memfunc.yMax])
                  .range([h - 2*padding, 0]);

  //
  // var xAxis = d3.svg.axis();
  // var yAxis = d3.svg.axis()
  //             .scale(yScale)
  //             .orient("left");
  //
  // xAxis.scale(xScale);
  //
  // vis.append("g")
  // .attr("class", "axis")
  // .attr("transform", "translate("+padding+","+ (h - 2 * padding) + ")")
  // .call(xAxis);
  //
  // vis.append("g")
  // .attr("class", "axis")
  // .attr("transform", "translate(" + padding + ", 0)")
  // .call(yAxis);
  //
  // vis.append("text")
  // .attr("x", w/2 - padding )
  // .attr("y",  h - padding)
  // .style("text-anchor", "middle")
  // .text(memfunc.xLabel);
  //
  // vis.append("text")
  // .attr("transform", "rotate(-90)")
  // .attr("x", padding-(h/2))
  // .attr("y", 0)
  // .style("text-anchor", "middle")
  // .text(memfunc.yLabel);

  update();

  vis.selectAll("circle.control")
  .data(function(d) { return points.slice(0, 6) })
  .enter().append("circle")
  .attr("class", "control")
  .attr("r", 7)
  .attr("cx", function(d){
    return xScale(d.x) + padding;
  })
  .attr("cy", function(d){
    return yScale(d.y);
  })
  .call(d3.behavior.drag()
  .on("dragstart", function(d) {
    //Drag behavior is here

    this.__origin__ = [d.x, d.y];
  })
  .on("drag", function(d) {

    // everything needs to be scaled now to maintain consistency between
    // view and model
    var xReverseScale = d3.scale.linear()
    .domain([0, w - 2*padding])
    .range([memfunc.xMin, memfunc.xMax]);

    var yReverseScale = d3.scale.linear()
    .domain([0, h - 2*padding])
    .range([memfunc.yMin, memfunc.yMax]);


    d.x = Math.min(memfunc.xMax, Math.max(memfunc.xMin, this.__origin__[0] += xReverseScale(d3.event.dx)));
    d.y = Math.min(memfunc.yMax, Math.max(memfunc.yMin, this.__origin__[1] -= yReverseScale(d3.event.dy)));

    bezier = {};
    update();

  })
  .on("dragend", function() {
    delete this.__origin__;
  }));

  // vis.append("text")
  // .attr("class", "t")
  // .attr("x", w / 2)
  // .attr("y", h)
  // .attr("text-anchor", "middle");

  vis.selectAll("text.controltext")
  .data(function(d) { return points.slice(0, 6); })
  .enter().append("text")
  .attr("class", "controltext")
  .attr("dx", "10px")
  .attr("dy", ".4em")
  .text(function(d, i) { return "P" + i });

  var last = 0;
  // d3.timer(function(elapsed) {
  //   // t = (t + (elapsed - last) / 5000) % 1;
  //   // last = elapsed;
  //   t = 1;
  //   update();
  // });

  function update() {
    var interpolation = vis.selectAll("g")
    .data(function(d) { return getLevels(d, t); });
    interpolation.enter().append("g")
    .style("fill", colour)
    .style("stroke", colour);

    // var circle = interpolation.selectAll("circle")
    // .data(Object);
    // circle.enter().append("circle")
    // .attr("r", 4);
    // circle
    // .attr("cx", x)
    // .attr("cy", y);

    // var path = interpolation.selectAll("path")
    // .data(function(d) { return [d]; });
    // path.enter().append("path")
    // .attr("class", "line")
    // .attr("d", line);
    // path.attr("d", line);

    //////

    xScale = d3.scale.linear()
    .domain([memfunc.xMin, memfunc.xMax])
    .range([0, w - 2*padding]);

    yScale = d3.scale.linear()
    .domain([memfunc.yMin, memfunc.yMax])
    .range([h - 2*padding, 0]);

    // xReverseScale = d3.scale.linear()
    // .domain([0, w - 2*padding])
    // .range([memfunc.xMin, memfunc.xMax]);
    //
    // yReverseScale = d3.scale.linear()
    // .domain([0, h - 2*padding])
    // .range([memfunc.yMin, memfunc.yMax]);

    var xAxis = d3.svg.axis();
    var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient("left");

    xAxis.scale(xScale);

    d3.select("#vis").selectAll(".axis").remove();
    d3.select("#vis").selectAll(".label").remove();
    d3.select("#graphTitle").remove();


    vis.append("text")
    .attr("x", (w / 2))
    .attr("y", padding)
    .attr("text-anchor", "middle")
    .attr("id", "graphTitle")
    .style("font-size", "16px")
    .style("text-decoration", "underline")
    .text(memfunc.title);


    vis.append("g")
    .attr("class", "axis")
    .attr("transform", "translate("+padding+","+ (h - 2 * padding) + ")")
    .call(xAxis);

    vis.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding + ", 0)")
    .call(yAxis);

    vis.append("text")
    .attr("class", "label")
    .attr("x", w/2 - padding )
    .attr("y",  h - padding)
    .style("text-anchor", "middle")
    .text(memfunc.xLabel);

    vis.append("text")
    .attr("class", "label")
    .attr("transform", "rotate(-90)")
    .attr("x", padding-(h/2))
    .attr("y", 0)
    .style("text-anchor", "middle")
    .text(memfunc.yLabel);

    /////

    var curve = vis.selectAll("path.curve")
    .data(getCurve);
    curve.enter().append("path")
    .attr("class", "curve");
    curve.attr("d", line);

    vis.selectAll("circle.control")
    .attr("cx", x)
    .attr("cy", y);

    vis.selectAll("text.controltext")
    .attr("x", x)
    .attr("y", y);
    // vis.selectAll("text.t")
    // .text("t=" + t.toFixed(2));
  }

  function interpolate(d, p) {
    if (arguments.length < 2) p = t;
    var r = [];
    for (var i=1; i<d.length; i++) {
      var d0 = d[i-1], d1 = d[i];
      r.push({x: d0.x + (d1.x - d0.x) * p, y: d0.y + (d1.y - d0.y) * p});
    }
    return r;
  }

  function getLevels(d, t_) {
    if (arguments.length < 2) t_ = t;
    var x = [points.slice(0, 6)];
    for (var i=1; i<d; i++) {
      x.push(interpolate(x[x.length-1], t_));
    }
    return x;
  }

  function getCurve(d) {
    var curve = bezier[d];
    if (!curve) {
      curve = bezier[d] = [];
      for (var t_=0; t_<=1; t_+=delta) {
        var x = getLevels(d, t_);
        curve.push(x[x.length-1][0]);
      }
    }
    return [curve.slice(0, t / delta + 1)];
  }

  function x(d) { return xScale(d.x) + padding; }
  function y(d) { return yScale(d.y); }
  function colour(d, i) {
    stroke(-i);
    return d.length > 1 ? stroke(i) : "red";
  }

  // Update the fields when they are edited
  $('.mem-fn').keyup(function(){
    if(selected_node.membership_functions.length > 0){
      var memFunc = selected_node.membership_functions[current_function];
      var id = $(this).attr('id').replace("Field", "");

      if(typeof memFunc[id] === "number"){
        console.log("This is numeric");
        memFunc[id] = Number($(this).val());
      }else{
        console.log("This is not numeric");
        memFunc[id] = $(this).val();
      }
      // memFunc.title = $('#titleField').val();
      // memFunc.xLabel = $('#xAxisField').val();
      // memFunc.yLabel = $('#yAxisField').val();
      // memFunc.xMin = $('#xMinField').val();
      // memFunc.xMax = $('#xMaxField').val();
      // memFunc.yMin = $('#yMinField').val();
      // memFunc.yMax = $('#yMaxField').val();
      //d3.select("#vis").selectAll("svg").remove();
      //bezier(memFunc, "myCurve");
      update();
    }
  });
}



$('#submitter').click(
  function(){
    //alert(JSON.stringify({nodes: nodes, links: links}));
    console.log({nodes: nodes, links: links});
    //$.post( "/", JSON.stringify({nodes: nodes, links: links}), function(data){ alert(data); } );
    $.ajax({
      type: "POST",
      contentType: "application/json",
      url: '/',
      data: JSON.stringify({nodes: nodes, links: links})  ,
      dataType: "json"
    });
  }
);


$('#creator').click(
  function(){

    if(selected_node === null){
      alert("No node selected");
      return;
    }

    selected_node.membership_functions.push({
      title: "Title",
      xLabel: "X Label",
      yLabel: "Y Label",
      xMin: 0,
      xMax: 100,
      yMin: 0,
      yMax: 1,
      points: [{x: 0, y: 0}, {x: 25, y: .25}, {x: 50, y: .5}, {x: 75, y: .75}, {x: 100, y: 1}]
    }
    );
    // var id = "curve" + selected_node.membership_functions.length;
    // d3.select("#vis")
    // .append("div")
    // .attr("id", id);
    // bezier(selected_node.membership_functions[selected_node.membership_functions.length - 1],id);
    current_function = selected_node.membership_functions.length -1;
    drawCurves();
});

// Save the session every 3 seconds
$("#save").click(function(){
  alert("Session saved!");
  localStorage.setItem('lastSessionData', JSON.stringify({nodes: nodes, links: links, last: lastNodeId}));
});
