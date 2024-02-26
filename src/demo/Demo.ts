import { Engine } from '../engine/Engine'
import * as THREE from 'three'
import { Box } from './Box'
//import { Experience } from '../engine/Experience'
import { Resource } from '../engine/Resources'
import * as CANNON from 'cannon-es'

import GUI from 'lil-gui'

export function v2v(v: CANNON.Vec3) {
  return new THREE.Vector3(v.x, v.y, v.z);
}
export function v2q(v: CANNON.Vec3) {
  return new THREE.Quaternion(v.x, v.y, v.z);
}
export function q2q(v: CANNON.Quaternion) {
  return new THREE.Quaternion(v.x, v.y, v.z, v.w);
}
export class Buddy {
  muscleInterface: LowLevelMuscleInteraction = new LowLevelMuscleInteraction()
  bodies: CANNON.Body[] = []
  constraints: CANNON.Constraint[] = []
  constructor(scale: number, angle: number, angleShoulders: number, twistAngle: number) {
    var bodies = []
    var constraints = []
    const shouldersDistance = 0.5 * scale
    const upperArmLength = 0.5 * scale
    const lowerArmLength = 0.5 * scale
    const upperArmSize = 0.2 * scale
    const lowerArmSize = 0.2 * scale
    const neckLength = 0.1 * scale
    const headRadius = 0.25 * scale
    const upperBodyLength = 0.6 * scale
    const pelvisLength = 0.4 * scale
    const upperLegLength = 0.5 * scale
    const upperLegSize = 0.2 * scale
    const lowerLegSize = 0.2 * scale
    const lowerLegLength = 0.5 * scale

    const jointPadding = 0.05 * scale

    const headShape = new CANNON.Sphere(headRadius)
    const upperArmShape = new CANNON.Box(
      new CANNON.Vec3(upperArmLength * 0.5 - jointPadding, upperArmSize * 0.5, upperArmSize * 0.5)
    )
    const lowerArmShape = new CANNON.Box(
      new CANNON.Vec3(lowerArmLength * 0.5 - jointPadding, lowerArmSize * 0.5, lowerArmSize * 0.5)
    )
    const upperBodyShape = new CANNON.Box(
      new CANNON.Vec3(shouldersDistance * 0.5, lowerArmSize * 0.5, upperBodyLength * 0.5 - jointPadding)
    )
    const pelvisShape = new CANNON.Box(
      new CANNON.Vec3(shouldersDistance * 0.5, lowerArmSize * 0.5, pelvisLength * 0.5 - jointPadding)
    )
    const upperLegShape = new CANNON.Box(
      new CANNON.Vec3(upperLegSize * 0.5, lowerArmSize * 0.5, upperLegLength * 0.5 - jointPadding)
    )
    const lowerLegShape = new CANNON.Box(
      new CANNON.Vec3(lowerLegSize * 0.5, lowerArmSize * 0.5, lowerLegLength * 0.5 - jointPadding)
    )
    

    // Lower legs
    const lowerLeftLeg = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(shouldersDistance / 2, 0, lowerLegLength / 2),
    })
    const lowerRightLeg = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(-shouldersDistance / 2, 0, lowerLegLength / 2),
    })
    lowerLeftLeg.addShape(lowerLegShape)
    lowerRightLeg.addShape(lowerLegShape)
    bodies.push(lowerLeftLeg)
    bodies.push(lowerRightLeg)

    // Upper legs
    const upperLeftLeg = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(
        shouldersDistance / 2,
        0,
        lowerLeftLeg.position.z + lowerLegLength / 2 + upperLegLength / 2
      ),
    })
    const upperRightLeg = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(
        -shouldersDistance / 2,
        0,
        lowerRightLeg.position.z + lowerLegLength / 2 + upperLegLength / 2
      ),
    })
    upperLeftLeg.addShape(upperLegShape)
    upperRightLeg.addShape(upperLegShape)
    bodies.push(upperLeftLeg)
    bodies.push(upperRightLeg)
    
    // Pelvis
    const pelvis = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 0, upperLeftLeg.position.z + upperLegLength / 2 + pelvisLength / 2),
    })
    pelvis.addShape(pelvisShape)
    bodies.push(pelvis)

    // Upper body
    const upperBody = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 0, pelvis.position.z + pelvisLength / 2 + upperBodyLength / 2),
    })
    upperBody.addShape(upperBodyShape)
    bodies.push(upperBody)

    // Head
    const head = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 0, upperBody.position.z + upperBodyLength / 2 + headRadius + neckLength),
    })
    head.addShape(headShape)
    bodies.push(head)

    // Upper arms
    const upperLeftArm = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(
        shouldersDistance / 2 + upperArmLength / 2,
        0,
        upperBody.position.z + upperBodyLength / 2
      ),
    })
    const upperRightArm = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(
        -shouldersDistance / 2 - upperArmLength / 2,
        0,
        upperBody.position.z + upperBodyLength / 2
      ),
    })
    upperLeftArm.addShape(upperArmShape)
    upperRightArm.addShape(upperArmShape)
    bodies.push(upperLeftArm)
    bodies.push(upperRightArm)

    // Lower arms
    const lowerLeftArm = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(
        upperLeftArm.position.x + lowerArmLength / 2 + upperArmLength / 2,
        0,
        upperLeftArm.position.z
      ),
    })
    const lowerRightArm = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(
        upperRightArm.position.x - lowerArmLength / 2 - upperArmLength / 2,
        0,
        upperRightArm.position.z
      ),
    })
    lowerLeftArm.addShape(lowerArmShape)
    lowerRightArm.addShape(lowerArmShape)
    bodies.push(lowerLeftArm)
    bodies.push(lowerRightArm)

    // Neck joint
    const neckJoint = new CANNON.ConeTwistConstraint(head, upperBody, {
      pivotA: new CANNON.Vec3(0, 0, -headRadius - neckLength / 2),
      pivotB: new CANNON.Vec3(0, 0, upperBodyLength / 2),
      axisA: CANNON.Vec3.UNIT_Z,
      axisB: CANNON.Vec3.UNIT_Z,
      angle,
      twistAngle,
    })
    constraints.push(neckJoint)

    // Knee joints
    const leftKneeJoint = new CANNON.ConeTwistConstraint(lowerLeftLeg, upperLeftLeg, {
      pivotA: new CANNON.Vec3(0, 0, lowerLegLength / 2),
      pivotB: new CANNON.Vec3(0, 0, -upperLegLength / 2),
      axisA: CANNON.Vec3.UNIT_Z,
      axisB: CANNON.Vec3.UNIT_Z,
      angle,
      twistAngle,
    })
    const rightKneeJoint = new CANNON.ConeTwistConstraint(lowerRightLeg, upperRightLeg, {
      pivotA: new CANNON.Vec3(0, 0, lowerLegLength / 2),
      pivotB: new CANNON.Vec3(0, 0, -upperLegLength / 2),
      axisA: CANNON.Vec3.UNIT_Z,
      axisB: CANNON.Vec3.UNIT_Z,
      angle,
      twistAngle,
    })
    constraints.push(leftKneeJoint)
    constraints.push(rightKneeJoint)

    // Hip joints
    const leftHipJoint = new CANNON.ConeTwistConstraint(upperLeftLeg, pelvis, {
      pivotA: new CANNON.Vec3(0, 0, upperLegLength / 2),
      pivotB: new CANNON.Vec3(shouldersDistance / 2, 0, -pelvisLength / 2),
      axisA: CANNON.Vec3.UNIT_Z,
      axisB: CANNON.Vec3.UNIT_Z,
      angle,
      twistAngle,
    })
    const rightHipJoint = new CANNON.ConeTwistConstraint(upperRightLeg, pelvis, {
      pivotA: new CANNON.Vec3(0, 0, upperLegLength / 2),
      pivotB: new CANNON.Vec3(-shouldersDistance / 2, 0, -pelvisLength / 2),
      axisA: CANNON.Vec3.UNIT_Z,
      axisB: CANNON.Vec3.UNIT_Z,
      angle,
      twistAngle,
    })
    constraints.push(leftHipJoint)
    constraints.push(rightHipJoint)

    // Spine
    const spineJoint = new CANNON.ConeTwistConstraint(pelvis, upperBody, {
      pivotA: new CANNON.Vec3(0, 0, pelvisLength / 2),
      pivotB: new CANNON.Vec3(0, 0, -upperBodyLength / 2),
      axisA: CANNON.Vec3.UNIT_Z,
      axisB: CANNON.Vec3.UNIT_Z,
      angle,
      twistAngle,
    })
    constraints.push(spineJoint)

    // Shoulders
    const leftShoulder = new CANNON.ConeTwistConstraint(upperBody, upperLeftArm, {
      pivotA: new CANNON.Vec3(shouldersDistance / 2, 0, upperBodyLength / 2),
      pivotB: new CANNON.Vec3(-upperArmLength / 2, 0, 0),
      axisA: CANNON.Vec3.UNIT_X,
      axisB: CANNON.Vec3.UNIT_X,
      angle: angleShoulders,
    })
    const rightShoulder = new CANNON.ConeTwistConstraint(upperBody, upperRightArm, {
      pivotA: new CANNON.Vec3(-shouldersDistance / 2, 0, upperBodyLength / 2),
      pivotB: new CANNON.Vec3(upperArmLength / 2, 0, 0),
      axisA: CANNON.Vec3.UNIT_X,
      axisB: CANNON.Vec3.UNIT_X,
      angle: angleShoulders,
      twistAngle,
    })
    constraints.push(leftShoulder)
    constraints.push(rightShoulder)

    // Elbow joint
    const leftElbowJoint = new CANNON.ConeTwistConstraint(lowerLeftArm, upperLeftArm, {
      pivotA: new CANNON.Vec3(-lowerArmLength / 2, 0, 0),
      pivotB: new CANNON.Vec3(upperArmLength / 2, 0, 0),
      axisA: CANNON.Vec3.UNIT_X,
      axisB: CANNON.Vec3.UNIT_X,
      angle,
      twistAngle,
    })
    const rightElbowJoint = new CANNON.ConeTwistConstraint(lowerRightArm, upperRightArm, {
      pivotA: new CANNON.Vec3(lowerArmLength / 2, 0, 0),
      pivotB: new CANNON.Vec3(-upperArmLength / 2, 0, 0),
      axisA: CANNON.Vec3.UNIT_X,
      axisB: CANNON.Vec3.UNIT_X,
      angle,
      twistAngle,
    })
    constraints.push(leftElbowJoint)
    constraints.push(rightElbowJoint)

    // add springs
    const muscleParams = {
      stiffness: 75,
      damping: 10
    }
    // lower leg muscles
    this.createMusclesFrontBack(upperLeftLeg, lowerLeftLeg, upperLegLength, lowerLegLength, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams)
    this.createMusclesFrontBack(upperRightLeg, lowerRightLeg, upperLegLength, lowerLegLength, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams)

    // upper leg muscles
    // quads
    this.createMusclesFrontBack(pelvis, upperLeftLeg, pelvisLength, upperLegLength, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams, new CANNON.Vec3( shouldersDistance / 2, 0, 0))
    this.createMusclesFrontBack(pelvis, upperRightLeg, pelvisLength, upperLegLength, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams, new CANNON.Vec3( -shouldersDistance / 2, 0, 0))
    
    // spread / close
    this.createMusclesFrontBack(pelvis, upperLeftLeg, pelvisLength, upperLegLength, new CANNON.Vec3(lowerLegSize, 0, 0), muscleParams, new CANNON.Vec3( shouldersDistance / 2, 0, 0))
    this.createMusclesFrontBack(pelvis, upperRightLeg, pelvisLength, upperLegLength, new CANNON.Vec3(-lowerLegSize, 0, 0), muscleParams, new CANNON.Vec3( -shouldersDistance / 2, 0, 0))
    
    // lower body
    // abs / lower back
    this.createMusclesFrontBack(upperBody, pelvis, upperBodyLength, pelvisLength, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams)
    // side
    this.createMusclesFrontBack(upperBody, pelvis, upperBodyLength, pelvisLength, new CANNON.Vec3(shouldersDistance / 2, 0, 0), muscleParams)

    // arms
    // elbows (biceps / triceps)
    this.createMusclesFrontBack(upperLeftArm, lowerLeftArm, upperArmLength, lowerArmLength, new CANNON.Vec3(0, 0, upperArmSize), muscleParams)
    this.createMusclesFrontBack(upperRightArm, lowerRightArm, upperArmLength, lowerArmLength, new CANNON.Vec3(0, 0, upperArmSize), muscleParams)
    // illegal elbows
    //this.createMusclesFrontBack(upperLeftArm, lowerLeftArm, upperArmLength, lowerArmLength, new CANNON.Vec3(0, upperArmSize, 0), muscleParams)

    // shoulders
    // front / back
    this.createMusclesFrontBack(upperBody, upperLeftArm, shouldersDistance, upperArmLength, new CANNON.Vec3(0, upperArmSize, 0), muscleParams, new CANNON.Vec3(0, 0, upperBodyLength / 2 - upperArmSize))
    this.createMusclesFrontBack(upperBody, upperRightArm, shouldersDistance, upperArmLength, new CANNON.Vec3(0, upperArmSize, 0), muscleParams, new CANNON.Vec3(0, 0, upperBodyLength / 2 - upperArmSize))
    // up / down
    this.createMusclesFrontBack(upperBody, upperLeftArm, shouldersDistance, upperArmLength, new CANNON.Vec3(0, 0, upperArmSize), muscleParams, new CANNON.Vec3(0, 0, upperBodyLength / 2 - upperArmSize))
    this.createMusclesFrontBack(upperBody, upperRightArm, shouldersDistance, upperArmLength, new CANNON.Vec3(0, 0, upperArmSize), muscleParams, new CANNON.Vec3(0, 0, upperBodyLength / 2 - upperArmSize))


    // left = local x positive

    
    this.bodies = bodies
    this.constraints = constraints
  }

  createMusclesFrontBack(bodyA: CANNON.Body, bodyB: CANNON.Body, bodyALength: number, bodyBLength: number, offset: CANNON.Vec3, params: {
    stiffness: number,
    damping: number
  }, bodyAOffset: CANNON.Vec3 = new CANNON.Vec3(0,0,0), bodyBOffset: CANNON.Vec3 = new CANNON.Vec3(0,0,0)) {
    const muscleParamsFront = {
      localAnchorA: offset.vadd(bodyAOffset),
      localAnchorB: offset.vadd(bodyBOffset) ,
      restLength: (bodyALength + bodyBLength) * 0.5,
      stiffness: params.stiffness ,
      damping: params.damping,
    }
    const muscleParamsBack = {
      localAnchorA: bodyAOffset.vadd(offset.scale(-1)),
      localAnchorB: bodyBOffset.vadd(offset.scale(-1)),
      restLength: (bodyALength + bodyBLength) * 0.5 * 0.9,
      stiffness: params.stiffness ,
      damping: params.damping,
    }
    this.muscleInterface.muscles.push(new Muscle(bodyA, bodyB, muscleParamsFront))
    this.muscleInterface.muscles.push(new Muscle(bodyA, bodyB, muscleParamsBack))
  }
}

export class LowLevelMuscleInteraction {

  muscles: Muscle[] = []
  setMuscleContraction(muscle: number, factor: number) {
    this.muscles[muscle].setContraction(factor)
  }

}
export class Muscle extends CANNON.Spring {
  normalRestLength: number
  
  setContraction(factor: number) {
   this.restLength = this.normalRestLength * factor
  }

  constructor(bodyA: CANNON.Body, bodyB: CANNON.Body, options?: {
        restLength?: number;
        stiffness?: number;
        damping?: number;
        localAnchorA?: CANNON.Vec3;
        localAnchorB?: CANNON.Vec3;
        worldAnchorA?: CANNON.Vec3;
        worldAnchorB?: CANNON.Vec3;
    }) {
        super(bodyA, bodyB, options)
        this.normalRestLength = this.restLength
  }
}
export class Physics {
  world: CANNON.World = new CANNON.World()
  bodies: CANNON.Body[] = []
  buddy: Buddy | undefined
  muscles: Muscle[] = []
  lastCallTime: number = 0
  constructor() {
    this.world.gravity = new CANNON.Vec3(0,-10,0);//-9.81,0)
  }

  update = () => {
    // Step world
    const timeStep = 1 / 60.0
    const now = performance.now() / 1000

    if (this.lastCallTime == 0) {
      this.lastCallTime = now
    }
    if (!this.lastCallTime) {
      // last call time not saved, cant guess elapsed time. Take a simple step.
      this.world.step(timeStep)
      this.lastCallTime = now
      return
    }

    let timeSinceLastCall = now - this.lastCallTime
    
    let maxSubSteps = 20
    this.world.step(timeStep, timeSinceLastCall, maxSubSteps)

    this.lastCallTime = now
    if (this.buddy){
      for (var i = 0; i < this.buddy.muscleInterface.muscles.length; i++) {
        this.buddy.muscleInterface.setMuscleContraction(i, Math.sin(now * ((i+1) % 5) + 3) + 1)
      }
    }
    
  }



  step() {

  }

}

export class Demo  {
  resources: Resource[] = []
  visuals: THREE.Object3D[] = []
  springs: THREE.Line[] = []
  scene: THREE.Scene 
  muscleTo3DLine: Map<Muscle, THREE.Line> = new Map()
  lllfc = 1

  lastCallTime: number = 0
  particleMaterial: THREE.MeshLambertMaterial
  triggerMaterial: THREE.MeshBasicMaterial
  materialColor: number
  solidMaterial: THREE.MeshLambertMaterial
  currentMaterial: THREE.MeshLambertMaterial
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  physics: Physics
  constructor(canvas: HTMLCanvasElement) {
    this.physics = new Physics()
    this.scene = new THREE.Scene()

    this.particleMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 })
    this.triggerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
    this.materialColor = 0xdddddd
    this.solidMaterial = new THREE.MeshLambertMaterial({ color: this.materialColor })
    
    this.currentMaterial = this.solidMaterial
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas })

    this.camera = new THREE.PerspectiveCamera(24, window.innerWidth / window.innerHeight, 5, 2000)

    this.camera.position.set(0, 20, 50)
    this.camera.lookAt(0, 0, 0)
  }
   
  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)

    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    )
    
    const floor = new CANNON.Body()
    floor.addShape(new CANNON.Box(new CANNON.Vec3(10,1,10)))
    this.physics.world.addBody(floor)
    this.addVisual(floor)
    plane.position.set(0,0.1,0);
    plane.rotation.x = -Math.PI / 2
    plane.receiveShadow = true

    this.scene.add(plane)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    let directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.castShadow = true
    directionalLight.position.set(2, 2, 2)

    this.scene.add(directionalLight)

    const gui = new GUI();
    // lllfc (lowerLeftLegFrontContraction)
    gui.add(this, "lllfc", 0, 1, 0.01);

    // Start the loop!
    this.animate()

    // Attach listeners
    window.addEventListener('resize', this.resize)
    document.addEventListener('keypress', this.onKeyPress)

    const buddy = new Buddy(3,
      Math.PI / 2,
      Math.PI * 2,
      Math.PI / 8)
      this.physics.buddy = (buddy)
      buddy.bodies.forEach((body: CANNON.Body) => {
      // Move the ragdoll up
      const position = new CANNON.Vec3(0, 3, 0)
      //let rotate = new CANNON.Quaternion(Math.PI, 0, 0)
      body.quaternion.setFromEuler(-Math.PI * 0.5, 0, 0)
      body.quaternion.vmult(body.position, body.position)
      body.position.vadd(position, body.position)
      

      this.physics.world.addBody(body)
      this.addVisual(body)
    })

    for (const muscle of buddy.muscleInterface.muscles) {
        //create a blue LineBasicMaterial
        const material = new THREE.LineBasicMaterial( { color: 0x0000ff } )
        const points = []
        points.push( new THREE.Vector3( 0, 0, 0 ) )
        points.push( new THREE.Vector3( 0, 0, 0 ) )

        const geometry = new THREE.BufferGeometry().setFromPoints( points )
        const line = new THREE.Line( geometry, material )
        this.springs.push(line)
        this.scene.add( line )
        this.muscleTo3DLine.set(muscle, line)
    }

    buddy.constraints.forEach((constraint) => {
      this.physics.world.addConstraint(constraint)
    })

    this.physics.world.addEventListener('postStep', () => {
      for (const spring of buddy.muscleInterface.muscles) {
          spring.applyForce()
      }
    })
  }

  addVisual(body: CANNON.Body) {
    if (!(body instanceof CANNON.Body)) {
      throw new Error('The argument passed to addVisual() is not a body')
    }

    // if it's a particle paint it red, if it's a trigger paint it as green, otherwise just gray
    const isParticle = body.shapes.every((s) => s instanceof CANNON.Particle)
    const material = isParticle ? this.particleMaterial : body.isTrigger ? this.triggerMaterial : this.currentMaterial

    // get the correspondant three.js mesh
    const mesh = this.bodyToMesh(body, material)

    // enable shadows on every object
    mesh.traverse((child) => {
      child.castShadow = true
      child.receiveShadow = true
    })

    this.physics.bodies.push(body)
    this.visuals.push(mesh)

    this.scene.add(mesh)
  }

  onKeyPress = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'Space': 
        console.debug("yyaya");
        break
    }
  }

  bodyToMesh(body: CANNON.Body, material: THREE.Material) {
    const group = new THREE.Group()
  
    group.position.copy(v2v(body.position))
    group.quaternion.copy(q2q(body.quaternion))
  
    const meshes = body.shapes.map((shape) => {
      const geometry = this.shapeToGeometry(shape)
  
      return new THREE.Mesh(geometry, material)
    })
  
    meshes.forEach((mesh, i) => {
      const offset = body.shapeOffsets[i]
      const orientation = body.shapeOrientations[i]
      mesh.position.copy(v2v(offset))
      mesh.quaternion.copy(q2q(orientation))
  
      group.add(mesh)
    })
  
    return group
  }
  shapeToGeometry(cannonShape: CANNON.Shape) {
    switch (cannonShape.type) {
      case CANNON.Shape.types.SPHERE: {
        let shape = cannonShape as CANNON.Sphere
        return new THREE.SphereGeometry(shape.radius, 8, 8)
      }
  
      case CANNON.Shape.types.PARTICLE: {
        return new THREE.SphereGeometry(0.1, 8, 8)
      }
  
      case CANNON.Shape.types.PLANE: {
        return new THREE.PlaneGeometry(500, 500, 4, 4)
      }
  
      case CANNON.Shape.types.BOX: {
        let shape = cannonShape as CANNON.Box
        return new THREE.BoxGeometry(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2)
      }
  
      case CANNON.Shape.types.CYLINDER: {
        let shape = cannonShape as CANNON.Cylinder
        return new THREE.CylinderGeometry(shape.radiusTop, shape.radiusBottom, shape.height, shape.numSegments)
      }

  
      default: {
        throw new Error(`Shape not recognized: "${cannonShape.type}"`)
      }
    }
  }
  resize() {}





  animate = () => {
    requestAnimationFrame(this.animate)
      this.physics.update()
      this.updateVisuals()
    this.renderer.render(this.scene, this.camera)
  }

  
  updateVisuals = () => {
    // Copy position data into visuals
    for (let i = 0; i < this.physics.bodies.length; i++) {
      const body = this.physics.bodies[i]
      const visual = this.visuals[i]
      let position = body.interpolatedPosition
      let quaternion = body.interpolatedQuaternion
      visual.position.copy(v2v(position))
      visual.quaternion.copy(q2q(quaternion))
      
    }
    for (const [muscle, line] of this.muscleTo3DLine.entries()) {
      const pointA = muscle.bodyA.position.vadd(muscle.bodyA.quaternion.vmult( muscle.localAnchorA))
      const pointB = muscle.bodyB.position.vadd(muscle.bodyB.quaternion.vmult( muscle.localAnchorB))
      line.geometry.setFromPoints([v2v(pointA), v2v(pointB)])
    }
    /*
    // Render contacts
    this.contactMeshCache.restart()
    if (this.settings.contacts) {
      // if ci is even - use body i, else j
      for (let i = 0; i < this.world.contacts.length; i++) {
        const contact = this.world.contacts[i]

        for (let ij = 0; ij < 2; ij++) {
          const mesh = this.contactMeshCache.request()
          const b = ij === 0 ? contact.bi : contact.bj
          const r = ij === 0 ? contact.ri : contact.rj
          mesh.position.set(b.position.x + r.x, b.position.y + r.y, b.position.z + r.z)
        }
      }
    }
    this.contactMeshCache.hideCached()

    // Lines from center of mass to contact point
    this.cm2contactMeshCache.restart()
    if (this.settings.cm2contact) {
      for (let i = 0; i < this.world.contacts.length; i++) {
        const contact = this.world.contacts[i]

        for (let ij = 0; ij < 2; ij++) {
          const line = this.cm2contactMeshCache.request()
          const b = ij === 0 ? contact.bi : contact.bj
          const r = ij === 0 ? contact.ri : contact.rj
          line.scale.set(r.x, r.y, r.z)
          makeSureNotZero(line.scale)
          line.position.copy(b.position)
        }
      }
    }
    this.cm2contactMeshCache.hideCached()

    this.distanceConstraintMeshCache.restart()
    this.p2pConstraintMeshCache.restart()
    if (this.settings.constraints) {
      this.world.constraints.forEach((constraint) => {
        switch (true) {
          // Lines for distance constraints
          case constraint instanceof CANNON.DistanceConstraint: {
            constraint.equations.forEach((equation) => {
              const { bi, bj } = equation

              const line = this.distanceConstraintMeshCache.request()

              // Remember, bj is either a Vec3 or a Body.
              const vector = bj.position || bj

              line.scale.set(vector.x - bi.position.x, vector.y - bi.position.y, vector.z - bi.position.z)
              makeSureNotZero(line.scale)
              line.position.copy(bi.position)
            })

            break
          }

          // Lines for point to point constraints
          case constraint instanceof CANNON.PointToPointConstraint: {
            constraint.equations.forEach((equation) => {
              const { bi, bj } = equation

              const relLine1 = this.p2pConstraintMeshCache.request()
              const relLine2 = this.p2pConstraintMeshCache.request()
              const diffLine = this.p2pConstraintMeshCache.request()
              if (equation.ri) {
                relLine1.scale.set(equation.ri.x, equation.ri.y, equation.ri.z)
              }
              if (equation.rj) {
                relLine2.scale.set(equation.rj.x, equation.rj.y, equation.rj.z)
              }
              // BUG this is not exposed anymore in the ContactEquation, this sections needs to be updated
              if (equation.penetrationVec) {
                diffLine.scale.set(-equation.penetrationVec.x, -equation.penetrationVec.y, -equation.penetrationVec.z)
              }
              makeSureNotZero(relLine1.scale)
              makeSureNotZero(relLine2.scale)
              makeSureNotZero(diffLine.scale)
              relLine1.position.copy(bi.position)
              relLine2.position.copy(bj.position)

              if (equation.bj && equation.rj) {
                equation.bj.position.vadd(equation.rj, diffLine.position)
              }
            })
            break
          }
        }
      })
    }

    this.p2pConstraintMeshCache.hideCached()
    this.distanceConstraintMeshCache.hideCached()
    */
  }
}
