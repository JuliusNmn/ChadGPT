
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
//import { Experience } from '../engine/Experience'
import { Resource } from '../engine/Resources'
import { Buddy, Muscle } from './Buddy'
import { Physics } from './Physics'

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
  gravity = -9.81
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
    gui.add(this, "gravity", -50, 1, 0.01);

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
      const mat = (line.material as THREE.LineBasicMaterial)
      mat.color = new THREE.Color(1 - muscle.currentContraction, 0, muscle.currentContraction)
    }

    this.physics.world.gravity = new CANNON.Vec3(0,this.gravity,0);//-9.81,0)
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
