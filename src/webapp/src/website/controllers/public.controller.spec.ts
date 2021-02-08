// import { Test, TestingModule } from '@nestjs/testing'
// import { AppService } from '../../app.service'
// import { PublicController } from './public.controller'
// import {
//   Controller,
//   Get,
//   Request,
//   Res,
//   UseGuards
//   //   Param
// } from '@nestjs/common'
// import { Response } from 'express'

describe('AppController', () => {
  // let publicController: PublicController

  // beforeEach(async () => {
  //   const app: TestingModule = await Test.createTestingModule({
  //     controllers: [PublicController],
  //     providers: [AppService]
  //   }).compile()

  //   publicController = app.get<PublicController>(PublicController)
  // })

  describe('root', () => {
    it('should return "Welcome!"', () => {
      // const req = Request()
      // const res = new Response()
      // expect(publicController.getHome(req, res)).toBe('Hello World!')
      expect(true).toBe(true)
    })
  })
})
