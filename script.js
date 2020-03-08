const pegRadius = 3;
const pathSize = 12;
const pegSpace = 9;
const marbleRadius = 3.5;
const pegSpacing = pegRadius * 2 + pegSpace;
function scaleCanvas(canvas, context, width, height) {
  // assume the device pixel ratio is 1 if the browser doesn't specify it
  const devicePixelRatio = window.devicePixelRatio || 1;

  // determine the 'backing store ratio' of the canvas context
  const backingStoreRatio = (
    context.webkitBackingStorePixelRatio ||
    context.mozBackingStorePixelRatio ||
    context.msBackingStorePixelRatio ||
    context.oBackingStorePixelRatio ||
    context.backingStorePixelRatio || 1
  );

  // determine the actual ratio we want to draw at
  const ratio = devicePixelRatio / backingStoreRatio;

  if (devicePixelRatio !== backingStoreRatio) {
    // set the 'real' canvas size to the higher width/height
    canvas.width = width * ratio;
    canvas.height = height * ratio;

    // ...then scale it back down with CSS
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }
  else {
    // this is a normal 1:1 device; just scale it simply
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '';
    canvas.style.height = '';
  }

  // scale the drawing context so everything will work at the higher ratio
  context.scale(ratio, ratio);
}
  let lineIntersect = (A, B, C, D) => {
    let a1 = B.y - A.y;
    let b1 = A.x - B.x;
    let c1 = a1*(A.x) + b1*(A.y);

    // Line CD represented as a2x + b2y = c2
    let a2 = D.y - C.y;
    let b2 = C.x - D.x;
    let c2 = a2*(C.x)+ b2*(C.y);

    let determinant = a1*b2 - a2*b1;

    if (determinant == 0)
    {
        // The lines are parallel. This is simplified
        return null;
    }
    else
    {
        let x = (b2*c1 - b1*c2)/determinant;
        let y = (a1*c2 - a2*c1)/determinant;
        return {x: x, y: y};
    }
  }
document.addEventListener('DOMContentLoaded', () => {

  let createRect = (offsetX, offsetY, width, height) => {
    let poly = Bodies.rectangle(0, 0, width, height, { isStatic: true })
    let offset = Matter.Vector.sub(poly.bounds.min, {x: 0, y: 0})
    Matter.Body.setPosition(poly, {x: offsetX - offset.x, y: offsetY - offset.y})
    return poly;
  }

  let createAlignedPolygon = (offsetX, offsetY, vertices, debug=false) => {
    let poly = Bodies.fromVertices(
      0, 0,
      Matter.Vertices.create(
        vertices
      ),
      {isStatic: true}
    )
    if (debug) {
      console.log(poly.vertices)
    }
    let offset = Matter.Vector.sub(poly.bounds.min, poly.position)
    Matter.Body.setPosition(poly, {x: offsetX - offset.x, y: offsetY - offset.y})
    return poly;
  }

  let createAlignedPolygonByVertex = (offsetX, offsetY, vertices, vertex) => {
    let poly = Bodies.fromVertices(
      0, 0,
      Matter.Vertices.create(
        vertices
      ),
      {isStatic: true}
    )
    let offset = Matter.Vector.sub(poly.vertices[vertex], poly.position)
    Matter.Body.setPosition(poly, {x: offsetX - offset.x, y: offsetY - offset.y})
    return poly;
  }

  let createFunnel = (offsetX, offsetY, topWidth, bottomWidth, funnelHeight, funnelSideHeight = 10) => {
    let side1 = createAlignedPolygon(offsetX, offsetY,
          [
            { x: 0, y: 0},
            { x: topWidth / 2 - bottomWidth, y: funnelHeight},
            { x: topWidth / 2 - bottomWidth, y: funnelHeight + funnelSideHeight},
            { x: 0 , y: funnelHeight + funnelSideHeight},
          ]
      )
    let side2 = createAlignedPolygon(
      offsetX + topWidth / 2 + bottomWidth, offsetY,
          [
            { x: 0, y: 0},
            { x: -topWidth / 2 + bottomWidth, y: funnelHeight },
            { x: -topWidth / 2 + bottomWidth, y: funnelHeight + funnelSideHeight},
            { x: 0 , y: funnelHeight + funnelSideHeight},
          ]
      )
    return [
      side1, side2
    ];
  }

  let createGaltonBoard = (offsetX, offsetY, width, height, split=0.5, angle=10) => {
    const funnelHeight = 30
    const funnelSideHeight = 10
    let galtonFunnel = createFunnel(offsetX - pegSpacing, offsetY, pegSpacing * width + pegSpacing * 2, pathSize, funnelHeight, funnelSideHeight);
    let curY = offsetY + funnelHeight + pegSpacing + funnelSideHeight;

    let galtonPegs = [];
    let offset = 0;
    for(let i = 0; i < height; i++) { // row
      for(let j = 0; j< width; j++) { // column
        let x = j * (pegSpacing) + offset * pegSpacing / 2 + offsetX;
        let y = i * (pegSpacing) + curY;
        galtonPegs.push(
          Bodies.circle(
            x, y, pegRadius, { isStatic: true }
          )
        )
      }
      if (offset == 0) {
        offset = 1;
      } else {
        offset = 0;
      }
    }

    curY += pegSpacing * (height);
    let colSize = 40;
    let colHeight = 40;

    let galtonColumns = [
      createRect(offsetX + width * pegSpacing/ 2, curY + pegSpacing, 4, colSize)
    ]
    let pinComposite = Matter.Composite.create({
      bodies: galtonColumns,
    })
    let pinCenter = {x: offsetX + width * pegSpacing / 2, y: curY + pegSpacing}
    Matter.Composite.rotate(pinComposite, angle * Math.PI / 180, pinCenter)

    curY += colHeight + pegSpacing;

    let totalSize = pegSpacing * 2 + width * pegSpacing;
    let leftSize = split * totalSize;
    let rightSize = totalSize - leftSize;
    let funnelLeft = createFunnel(offsetX - pegSpacing, curY, leftSize, pathSize, 20)
    let funnelRight = createFunnel(offsetX + leftSize - pegSpacing, curY, rightSize, pathSize, 20)
    let splitter = funnelLeft.concat(funnelRight);

    curY += 30; // funnel height 20 + side = 10

    let borderThickness = 6;
    let border = [
      createRect(offsetX - pegSpacing, offsetY, borderThickness, curY - offsetY),
      createRect(offsetX + width * pegSpacing + pegSpacing - borderThickness, offsetY, borderThickness, curY - offsetY)
    ]

    let bodies = galtonPegs.concat(galtonColumns).concat(galtonFunnel).concat(splitter).concat(border);
    let leftExit = funnelLeft[0].bounds.max
    leftExit.x += pegSpace;
    let rightExit = funnelRight[0].bounds.max
    rightExit.x += pegSpace;
    return {
      bodies: bodies,
      x: offsetX,
      y: offsetY,
      width: width,
      height: height,
      split: split,
      leftExit: leftExit,
      rightExit: rightExit,
      pinComposite: pinComposite,
      pinCenter: pinCenter,
      pinAngle: angle,
      entry: { x: offsetX + (width * pegSpacing / 2), y: offsetY},
    }
  }

  let createNeighborhood = (offsetX, offsetY) => {
    const width = 160;
    const height = 80;
    const size = 12;
    return {
      entry: {x :offsetX + width /2, y: offsetY},
      bodies: [
        createRect(offsetX, offsetY, size, height),
        createRect(offsetX + width - size, offsetY, size, height),
        createRect(offsetX, offsetY + height, width, size),
      ]

    }

  }

  let createPath = (start, end) => {
    // return object representing a path between the two coordinates of form {x, y}
    const size = 4;
    let path = {
      start: start,
      end: end,
      bodies: [
        // first the left one
        createAlignedPolygonByVertex(
          start.x - pathSize, start.y,
          [
            { x: -size, y: 0, },
            { x: size, y: 0, },
            { x: end.x - start.x + size, y: end.y - start.y, },
            { x: end.x - start.x - size, y: end.y - start.y, },
          ],
          1,
        ),
        createAlignedPolygonByVertex(
          start.x + pathSize, start.y,
          [
            { x: -size, y: 0, },
            { x: size, y: 0, },
            { x: end.x - start.x + size, y: end.y - start.y, },
            { x: end.x - start.x - size, y: end.y - start.y, },
          ],
          0,
        ),
      ],
    }
    return path;
  }

  let createPathExitVertical = (start, end, vert = 40) => {
    let path1 = createPath(start, {x: end.x, y: end.y - vert})
    let path2 = createPath({x: end.x, y: end.y - vert}, end)
    return {
      start: start,
      end: end,
      vert: vert,
      paths: [path1, path2],
      bodies: path1.bodies.concat(path2.bodies),
    }
  }

  let getMarbles = (type, n) => {
    let circles = [];
    let x = 150
    let fill = '#866';
    if (type == 'white') {
      fill = '#eee';
      x = 240;
    }
    for(let i = 0; i < n; i++) {
      circles.push(
        Bodies.circle(
          Math.random() * 50 + x,
          Math.random() * 80,
          marbleRadius,
          {
            restitution: 0,
            friction: 0.05,
            density: 0.01,
            render: {
              fillStyle: fill,
            }
          }
        )
      )
    }
    return circles;
  }

  // module aliases
  var Engine = Matter.Engine,
      Render = Matter.Render,
      World = Matter.World,
      Bodies = Matter.Bodies;

  // create an engine
  var engine = Engine.create();

  // create a renderer
  var render = Render.create({
      canvas: document.getElementById('canvas'),
      engine: engine,
      options: {
        height: window.innerHeight,
        width: window.innerWidth,
        wireframes: false,
      }
  });

  // create two boxes and a ground
  let circles = getMarbles('black', 50);
  circles = circles.concat(getMarbles('white', 50))

  let crimeBlack = createGaltonBoard(100, 100, 8, 4, 0.5, 110)
  let crimeWhite = createGaltonBoard(240, 100, 8, 4, 0.5, -110)
  let housingANoCrime = createGaltonBoard(100, 400, 8, 4, 0.5, -110)
  let housingACrime = createGaltonBoard(240, 400, 8, 4, 0.5, 110)
  let path1 = createPathExitVertical(crimeBlack.leftExit, housingANoCrime.entry, 30)
  let path2 = createPathExitVertical(crimeBlack.rightExit, {x: housingACrime.entry.x - 30, y: housingACrime.entry.y}, 20);
  let housingANeighborhood = createNeighborhood(100, 750)
  let pathANoCrime = createPathExitVertical(
    housingANoCrime.leftExit,
    { x: housingANeighborhood.entry.x - 30, y: housingANeighborhood.entry.y}, 40)
  let pathACrime = createPathExitVertical(housingACrime.leftExit, {x: housingANeighborhood.entry.x + 20, y: housingANeighborhood.entry.y }, 20)

  let pathWhiteNoCrime = createPathExitVertical(crimeWhite.leftExit, {x: housingANoCrime.entry.x + 30, y: housingANoCrime.entry.y}, 20);
  let pathWhiteCrime = createPathExitVertical(crimeWhite.rightExit, {x: housingACrime.entry.x + 30, y: housingACrime.entry.y}, 20);

  //let housingB = createGaltonBoard(400, 700, 8, 6, 0.8)
  let housingB = createNeighborhood(240, 750)
  let pathHousingNoCrimeReject = createPathExitVertical(housingANoCrime.rightExit, { x: housingB.entry.x - 40, y: housingB.entry.y}, 10);
  let pathHousingCrimeReject = createPathExitVertical(
    housingACrime.rightExit,
    housingB.entry,
    10,
  )

  let allBodies = (circles)
    .concat(crimeBlack.bodies)
    .concat(crimeWhite.bodies)
    .concat(housingANoCrime.bodies)
    .concat(path1.bodies)
    .concat(path2.bodies)
    .concat(housingACrime.bodies)
    .concat(housingB.bodies)
    .concat(housingANeighborhood.bodies)
    .concat(pathANoCrime.bodies)
    .concat(pathACrime.bodies)
    .concat(pathHousingCrimeReject.bodies)
    .concat(pathHousingNoCrimeReject.bodies)
    .concat(pathWhiteNoCrime.bodies)
    .concat(pathWhiteCrime.bodies)


  let paths = [path1, path2, pathANoCrime, pathACrime, pathWhiteNoCrime, pathWhiteCrime, pathHousingCrimeReject, pathHousingNoCrimeReject];
  let all_path_bodies = paths.map(f => f.bodies).flat();
  // look for collisions
  let teleporters = [];
  for (let path_i = 0; path_i < paths.length; path_i++) {
    for (let path_j = path_i + 1; path_j < paths.length; path_j++) {
      // check if the path_i collides with path_j
      let collision = Matter.SAT.collides(paths[path_i].paths[0].bodies[0], paths[path_j].paths[0].bodies[0])
      if (collision.collided) {
        let intersect = lineIntersect(
          paths[path_i].paths[0].start,
          paths[path_i].paths[0].end,
          paths[path_j].paths[0].start,
          paths[path_j].paths[0].end,
        )
        let i_dy = paths[path_i].paths[0].end.y - paths[path_i].paths[0].start.y
        let i_dx = paths[path_i].paths[0].end.x - paths[path_i].paths[0].start.x

        let j_dy = paths[path_j].paths[0].end.y - paths[path_j].paths[0].start.y
        let j_dx = paths[path_j].paths[0].end.x - paths[path_j].paths[0].start.x

        let i_m = i_dy / i_dx;
        let j_m = j_dy / j_dx;

        let r = pathSize * 1.5;

        let i_dx_ = r / Math.sqrt(1 + i_m * i_m);
        let j_dx_ = r / Math.sqrt(1 + j_m * j_m);

        console.log(paths[path_i].paths[0], i_dy, i_dx, i_m, i_dx_)
        console.log(paths[path_j].paths[0], j_dy, j_dx, j_m, j_dx_)
        let points_i = [
          {x: intersect.x - i_dx_, y: intersect.y - i_dx_ * i_m},
          {x: intersect.x + i_dx_, y: intersect.y + i_dx_ * i_m}
        ]
        let points_j = [
          {x: intersect.x - j_dx_, y: intersect.y - j_dx_ * j_m},
          {x: intersect.x + j_dx_, y: intersect.y + j_dx_ * j_m}
        ]
        let entry_i = points_i[0];
        let exit_i = points_i[1];

        let entry_j = points_j[0];
        let exit_j = points_j[1];

        if (i_m < 0) {
          entry_i = points_i[1];
          exit_i = points_i[0];
        }
        if (j_m < 0) {
          entry_j = points_j[1];
          exit_j = points_j[0];
        }
        /*
        teleporters.push({
          center: intersect,
          entry_i: entry_i,
          exit_i: exit_i,
          entry_j: entry_j,
          exit_j: exit_j,
          body: Matter.Bodies.circle(intersect.x, intersect.y, pathSize * 1.3, { isStatic: true}),
        })
        */
        teleporters.push({
          center: entry_i,
          exit: exit_i,
          body: Matter.Bodies.circle(entry_i.x, entry_i.y, pathSize * 1, { isStatic: true, isSensor: true }),
        })
        teleporters.push({
          center: entry_j,
          exit: exit_j,
          body: Matter.Bodies.circle(entry_j.x, entry_j.y, pathSize * 1, { isStatic: true, isSensor: true}),
        })
      }
    }
  }
  console.log(teleporters)
  let teleporterMap = {}
  for (teleporter of teleporters) {
    teleporterMap[teleporter.body.id] = teleporter;
  }

  allBodies = allBodies.concat(teleporters.map(t => t.body));

  // add all of the bodies to the world
  World.add(engine.world, allBodies)

  // run the engine
  Engine.run(engine);

  // run the renderer
  Render.run(render);

  // mouse debug X/Y
  let debugOut = document.getElementById('debugout');
  window.addEventListener('mousedown', (e) => {
    debugOut.innerHTML = `x: ${e.clientX}, y: ${e.clientY}`
    let circles = getMarbles('black', 5);
    circles = circles.concat(getMarbles('white', 5))
    World.add(engine.world, circles)
  })

  Matter.Events.on(engine, 'collisionStart', function(event) {
  	// We know there was a collision so fetch involved elements ...
    //console.log(event.pairs[0])
    for (pair of event.pairs) {
      if (pair.bodyB.id in teleporterMap) {
        console.log('teleport')
        Matter.Body.setPosition(pair.bodyA, teleporterMap[pair.bodyB.id].exit)
      }
      if (pair.bodyA.id in teleporterMap) {
        Matter.Body.setPosition(pair.bodyB, teleporterMap[pair.bodyA.id].exit)
      }
    }
  	// Now do something with the event and elements ... your task ;-)
  });

  /* xtra shift */
  document.getElementById('myRange').oninput = function() {
    console.log(this.value)
    Matter.Composite.rotate(crimeBlack.pinComposite, (this.value - crimeBlack.pinAngle)* Math.PI / 180, crimeBlack.pinCenter)
    crimeBlack.pinAngle = this.value
  }

})
