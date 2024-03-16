import * as CANNON from 'cannon-es'
import * as tf from '@tensorflow/tfjs'

export class Brain {
  io: HumanIO
  model: tf.Sequential

  constructor(io: HumanIO){
    this.io = io;
    const stateInputDimension = this.io.getBodyState().length + this.getImpulseGeneratorValues(0).length
    console.log("input dim: " + stateInputDimension)
    const decisionOutputDimension = this.io.muscles.length;

    this.model = tf.sequential();
    const hiddenLayer = 30;
    const A1 = tf.randomNormal([stateInputDimension, hiddenLayer], 0, 0.5)
    const B1 = tf.randomUniform([hiddenLayer], -0.5, 0.5)
    this.model.add(tf.layers.dense({units: hiddenLayer, inputShape: [stateInputDimension], weights: [A1, B1]}))

    const A2 = tf.randomNormal([hiddenLayer, decisionOutputDimension], 0, 0.5)
    const B2 = tf.randomUniform([decisionOutputDimension], -0.5, 0.5)
    this.model.add(tf.layers.dense({units: decisionOutputDimension, inputShape: [15], weights: [A2, B2], activation: 'relu'}))
    this.model.add(tf.layers.softmax())
  }

  computeStep(time: number) {
    const input = this.io.getBodyState().concat(this.getImpulseGeneratorValues(time));
    
    const inputTensor = tf.tensor([input]);
    const newMuscleConctractions = this.model.predict(inputTensor) as tf.Tensor<tf.Rank>
    const arr = newMuscleConctractions.dataSync();
    this.io.setMuscleContractions(Array.from(arr))
    
  }

  getImpulseGeneratorValues(time: number): number[] {
    return [Math.sin(time), Math.cos(time),
      Math.sin(2 * time), Math.cos(2 * time),
      Math.sin(3 * time), Math.cos(3 * time), ]
  }
}

export class HumanIO {

    muscles: Muscle[] = []

    setMuscleContractions(contractions: number[]){
      const factor = 10
      this.muscles.forEach((muscle, idx) => muscle.setContraction(contractions[idx] * factor))
    }

    setMuscleContraction(muscle: number, factor: number) {
      this.muscles[muscle].setContraction(factor)
    }

    addMuscle(mus : Muscle){
      this.muscles.push(mus)
    }

    getBodyState() : number[] {

        return this.muscles.flatMap( (m) => {
              if (m.isFront){
                var rotA = new CANNON.Vec3();
                var rotB = new CANNON.Vec3();
                m.bodyA.quaternion.toEuler(rotA)
                m.bodyB.quaternion.toEuler(rotB)
    
                //TODO: If needed, delete the unneccesary muscles because theyre duplicate
                return  [m.currentContraction].concat(rotA.vsub(rotB).toArray(), rotA.toArray(), 
                rotB.toArray())
              } else {
                return [m.currentContraction]
              }
              
            }
            )
    }


}
export class Muscle extends CANNON.Spring {
    normalRestLength: number
    currentContraction: number = 1
    minimumContraction = 0
    maximumContraction = 2
    isFront: boolean;
    setContraction(factor: number) {
      const factorConstrained = Math.min(this.maximumContraction, Math.max(this.minimumContraction, factor))  
      this.restLength = this.normalRestLength * factorConstrained
      this.currentContraction = factor;
    }
  
    constructor(bodyA: CANNON.Body, bodyB: CANNON.Body, isFront: boolean, options?: {
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
          this.isFront = isFront
    }
  }
export class Buddy {
    muscleInterface: HumanIO = new HumanIO()
    brain: Brain
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
  
      const footLength = 0.15 * scale
      const footWidth = 0.15 * scale
      const footHeight = 0.05 * scale
      const heelRadius = 0.1 * scale
  
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
      const heelShape = new CANNON.Cylinder(heelRadius, heelRadius, footWidth, 8)
      const footShape = new CANNON.Box(
        new CANNON.Vec3(footWidth, footLength, footHeight)
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
      
      // feet 
      const leftFoot = new CANNON.Body({
        mass: 0.2,
        position: new CANNON.Vec3(shouldersDistance / 2, 0,  lowerLeftLeg.position.z - lowerLegLength / 2 ),
      })
      leftFoot.addShape(heelShape, new CANNON.Vec3(0,heelRadius, 0), new CANNON.Quaternion().setFromEuler(0, 0, Math.PI / 2))
      leftFoot.addShape(footShape, new CANNON.Vec3(0,- footLength / 2 - heelRadius,0))
      bodies.push(leftFoot)
      const rightFoot = new CANNON.Body({
        mass: 0.2,
        position: new CANNON.Vec3(-shouldersDistance / 2, 0,  lowerRightLeg.position.z - lowerLegLength / 2 ),
      })
      rightFoot.addShape(heelShape, new CANNON.Vec3(0,heelRadius, 0), new CANNON.Quaternion().setFromEuler(0, 0, Math.PI / 2))
      rightFoot.addShape(footShape, new CANNON.Vec3(0,- footLength / 2 - heelRadius,0))
      bodies.push(rightFoot)
  
  
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
  
      const leftFootJoint = new CANNON.ConeTwistConstraint(leftFoot, lowerLeftLeg, {
        pivotA: new CANNON.Vec3(0, 0, heelRadius),
        pivotB: new CANNON.Vec3(0, 0, -lowerLegLength / 2),
        axisA: CANNON.Vec3.UNIT_Z,
        axisB: CANNON.Vec3.UNIT_Z,
        angle: angle,
        twistAngle: twistAngle,
      })
      const rightFootJoint = new CANNON.ConeTwistConstraint(rightFoot, lowerRightLeg, {
        pivotA: new CANNON.Vec3(0, 0, heelRadius),
        pivotB: new CANNON.Vec3(0, 0, -lowerLegLength / 2),
        axisA: CANNON.Vec3.UNIT_Z,
        axisB: CANNON.Vec3.UNIT_Z,
        angle: angle,
        twistAngle: twistAngle,
      })
      constraints.push(leftFootJoint)
      constraints.push(rightFootJoint)
  
  
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
      /*
      const leftShoulder = new CANNON.PointToPointConstraint(
        upperBody,
        new CANNON.Vec3(shouldersDistance / 2, 0, upperBodyLength / 2),
        upperLeftArm,
        new CANNON.Vec3(-upperArmLength / 2, 0, 0),
      )
      const rightShoulder = new CANNON.PointToPointConstraint(
        upperBody,
        new CANNON.Vec3(-shouldersDistance / 2, 0, upperBodyLength / 2),
        upperRightArm,
        new CANNON.Vec3(upperArmLength / 2, 0, 0),
      )*/
      // Shoulders
      const leftShoulder = new CANNON.ConeTwistConstraint(upperBody, upperLeftArm, {
        pivotA: new CANNON.Vec3(shouldersDistance / 2, 0, upperBodyLength / 2),
        pivotB: new CANNON.Vec3(-upperArmLength / 2, 0, 0),
        axisA: CANNON.Vec3.UNIT_X,
        axisB: CANNON.Vec3.UNIT_X,
        angle: Math.PI,
        twistAngle: Math.PI / 2
      })
      const rightShoulder = new CANNON.ConeTwistConstraint(upperBody, upperRightArm, {
        pivotA: new CANNON.Vec3(-shouldersDistance / 2, 0, upperBodyLength / 2),
        pivotB: new CANNON.Vec3(upperArmLength / 2, 0, 0),
        axisA: CANNON.Vec3.UNIT_X,
        axisB: CANNON.Vec3.UNIT_X,
        angle: Math.PI,
        twistAngle: Math.PI / 2
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
        stiffness: 50,
        damping: 5
      }
      // lower leg muscles
      this.createMusclesFrontBack(upperLeftLeg, lowerLeftLeg, 1, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams)
      this.createMusclesFrontBack(upperRightLeg, lowerRightLeg, 1, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams)
  
      // foot muscles
      // up / down
      this.createMusclesFrontBack(lowerLeftLeg, leftFoot, 1, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams)
      this.createMusclesFrontBack(lowerRightLeg, rightFoot, 1, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams)
      // pitch
      this.createMusclesFrontBack(lowerLeftLeg, leftFoot, 1, new CANNON.Vec3(lowerLegSize / 2, 0, 0), muscleParams)
      this.createMusclesFrontBack(lowerRightLeg, rightFoot, 1, new CANNON.Vec3(lowerLegSize / 2, 0, 0), muscleParams)
  
      // upper leg muscles
      // quads
      this.createMusclesFrontBack(pelvis, upperLeftLeg, 1, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams, new CANNON.Vec3( shouldersDistance / 2, 0, 0))
      this.createMusclesFrontBack(pelvis, upperRightLeg, 1, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams, new CANNON.Vec3( -shouldersDistance / 2, 0, 0))
      
      // spread / close
      this.createMusclesFrontBack(pelvis, upperLeftLeg, 1, new CANNON.Vec3(lowerLegSize, 0, 0), muscleParams, new CANNON.Vec3( shouldersDistance / 2, 0, 0))
      this.createMusclesFrontBack(pelvis, upperRightLeg, 1, new CANNON.Vec3(-lowerLegSize, 0, 0), muscleParams, new CANNON.Vec3( -shouldersDistance / 2, 0, 0))
      
      // lower body
      // abs / lower back
      this.createMusclesFrontBack(upperBody, pelvis, 1, new CANNON.Vec3(0, lowerLegSize, 0), muscleParams)
      // side
      this.createMusclesFrontBack(upperBody, pelvis, 1, new CANNON.Vec3(shouldersDistance / 2, 0, 0), muscleParams)
  
      // arms
      // elbows (biceps / triceps)
      this.createMusclesFrontBack(upperLeftArm, lowerLeftArm, 1, new CANNON.Vec3(0, 0, upperArmSize), muscleParams)
      this.createMusclesFrontBack(upperRightArm, lowerRightArm, 1, new CANNON.Vec3(0, 0, upperArmSize), muscleParams)
      // illegal elbows
      //this.createMusclesFrontBack(upperLeftArm, lowerLeftArm, upperArmLength, lowerArmLength, new CANNON.Vec3(0, upperArmSize, 0), muscleParams)
  
      // shoulders
      // front / back
      this.createMusclesFrontBack(upperBody, upperLeftArm, 1, new CANNON.Vec3(0, upperArmSize, 0), muscleParams, new CANNON.Vec3(0, 0, upperBodyLength / 2 - upperArmSize))
      this.createMusclesFrontBack(upperBody, upperRightArm, 1, new CANNON.Vec3(0, upperArmSize, 0), muscleParams, new CANNON.Vec3(0, 0, upperBodyLength / 2 - upperArmSize))
      // up / down
      this.createMusclesFrontBack(upperBody, upperLeftArm, 1, new CANNON.Vec3(0, 0, upperArmSize), muscleParams, new CANNON.Vec3(0, 0, upperBodyLength / 2 + upperArmSize / 2))
      this.createMusclesFrontBack(upperBody, upperRightArm, 1, new CANNON.Vec3(0, 0, upperArmSize), muscleParams, new CANNON.Vec3(0, 0, upperBodyLength / 2 + upperArmSize / 2))
  
  
      // left = local x positive
  
      this.brain = new Brain(this.muscleInterface)
      this.bodies = bodies
      this.constraints = constraints
    }
  
    createMusclesFrontBack(bodyA: CANNON.Body, bodyB: CANNON.Body, relaxFactor: number, offset: CANNON.Vec3, params: {
      stiffness: number,
      damping: number
    }, bodyAOffset: CANNON.Vec3 = new CANNON.Vec3(0,0,0), bodyBOffset: CANNON.Vec3 = new CANNON.Vec3(0,0,0)) {
      const restLength = bodyA.position.vadd(bodyAOffset).vsub(bodyB.position.vadd(bodyBOffset)).length()
      const muscleParamsFront = {
        localAnchorA: offset.vadd(bodyAOffset),
        localAnchorB: offset.vadd(bodyBOffset) ,
        restLength: restLength * relaxFactor,
        stiffness: params.stiffness ,
        damping: params.damping,
      }
      const muscleParamsBack = {
        localAnchorA: bodyAOffset.vadd(offset.scale(-1)),
        localAnchorB: bodyBOffset.vadd(offset.scale(-1)),
        restLength: restLength * relaxFactor,
        stiffness: params.stiffness ,
        damping: params.damping,
      }

      this.muscleInterface.addMuscle(new Muscle(bodyA, bodyB, true, muscleParamsFront))
      this.muscleInterface.addMuscle(new Muscle(bodyA, bodyB, false, muscleParamsBack))
    }
  }
  