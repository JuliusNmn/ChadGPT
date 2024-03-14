
import * as CANNON from 'cannon-es'
import { Buddy, Muscle } from './Buddy'



export class Physics {
    world: CANNON.World = new CANNON.World()
    bodies: CANNON.Body[] = []
    buddy: Buddy | undefined
    muscles: Muscle[] = []
    lastCallTime: number = 0
    constructor() {
      this.world.gravity = new CANNON.Vec3(0,-0,0);//-9.81,0)
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
          //this.buddy.muscleInterface.setMuscleContraction(i, Math.sin(now * (3 + i / 3) * ((i % 2) * 2 - 1)) * 0.1 + 0.8)
          this.buddy.muscleInterface.setMuscleContraction(i, 1)
        }
        console.log(this.buddy.muscleInterface.muscles.length)
      }
      
    }
  
  
  
    step() {
        
    }
  
  }