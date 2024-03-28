
import * as CANNON from 'cannon-es'
import { Buddy, Muscle } from './Buddy'



export class Physics extends CANNON.World{
    bodies: CANNON.Body[] = []
    buddy: Buddy | undefined
    muscles: Muscle[] = []
    lastCallTime: number = 0
    constructor() {
      super()
      this.gravity = new CANNON.Vec3(0,-0,0);//-9.81,0)
    }


    deleteBuddy() {
      const buddyBodies = this.buddy?.bodies
      if(buddyBodies){
        buddyBodies.forEach((body) => {
          const index = this.bodies.indexOf(body)
          if(index != -1){
            this.removeBody(body)
          }
        })
      }

      this.buddy = undefined
    }

    initializeBuddy() : Buddy{
      const buddy = new Buddy(3,
        Math.PI / 2,
        Math.PI * 2,
        Math.PI / 8)
      
      buddy.bodies.forEach((body: CANNON.Body) => {
        const position = new CANNON.Vec3(0, 1.25, 0)
        body.quaternion.setFromEuler(-Math.PI * 0.5, 0, 0)
        body.quaternion.vmult(body.position, body.position)
        body.position.vadd(position, body.position)    
        this.addBody(body)
      })

      buddy.constraints.forEach((constraint) => {
        this.addConstraint(constraint)
      })
        
      return buddy
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
        this.step(timeStep)
        this.lastCallTime = now
        return
      }
  
      let timeSinceLastCall = now - this.lastCallTime
      
      let maxSubSteps = 20
      this.step(timeStep, timeSinceLastCall, maxSubSteps)
  
      this.lastCallTime = now
      //TODO: This is unneccessary no?
      /* if (this.buddy){
        for (var i = 0; i < this.buddy.muscleInterface.muscles.length; i++) {
          //this.buddy.muscleInterface.setMuscleContraction(i, Math.sin(now * (3 + i / 3) * ((i % 2) * 2 - 1)) * 0.1 + 0.8)
          this.buddy.muscleInterface.setMuscleContraction(i, 1)
        }
      } */
      
    }

  
  }