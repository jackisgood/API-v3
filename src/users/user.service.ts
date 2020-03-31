import { Injectable, ParseArrayPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Ecgrealtime3Service } from '../ecgrealtime3/ecgrealtime3.service';
import { Ecgrealtime3 } from '../ecgrealtime3/ecgrealtime3.entity';
import { promises } from 'dns';
import { threadId } from 'worker_threads';
import { timer } from 'rxjs';
const fetch = require("node-fetch");
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly ecgrealtime3Service: Ecgrealtime3Service
  ) { }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

    async getUserById(id:number): Promise<User> {
        return await this.userRepository.findOne({ 'userId': id } );
  }

  //async findByUserid(userId: string): Promise<User[]> {
  //  return await this.userRepository.find(userId);
 // }

  async createOne(user): Promise<User> {
	  user.userId=parseInt(user.userId);
	  user.Status=parseInt(user.Status);
	  user.Status_time=user.Status_time*1;
    const Isuser = await this.userRepository.findOne({ userId: user.userId });
    if (!Isuser) {
      return await this.userRepository.save(user);
    }
	
  }

  async updateStatus(patient_code,status) {
    patient_code=parseInt(patient_code);
     status=parseInt(status);
     await this.userRepository.update({userId:patient_code} , {Status_time:Date.now()});
     await this.userRepository.update({userId:patient_code} , {Status : status} );
    var check=this.userRepository.findOne({ 'userId': patient_code } );
    var temp_time=0;
    var num=patient_code.toString();
    var url='http://10.1.103.134:5544/ECG/ECG_3lead/';
    url=url.concat(num);
    while((await check).Status==1) {
      var data:any=[];
      fetch(url, {})
      .then((response) => {
      return response.json(); 
      

      }).then((jsonData) => {
      var reg1=jsonData.Diff_1.split(",");
      var t=reg1[0];
      t=parseInt(t);
      var reg2=jsonData.Diff_2.split(",");
      var reg3=jsonData.Diff_3.split(",");
      if (t!=temp_time) {
      temp_time=t;
      var d1:any=[];
      var d2:any=[];
      var d3:any=[];
      for (var i =0; i < reg1[1].length;i=i+4) {
        var tmp='0x'+reg1[1][i]+reg1[1][i+1]+reg1[1][i+2]+reg1[1][i+3];
        var trans=parseInt(tmp,16);
        if ((trans & 0x8000) > 0) {
          trans = trans - 0x10000;
       }
        trans=trans*0.020926339;
        d1.push(trans);
        tmp='0x'+reg2[1][i]+reg2[1][i+1]+reg2[1][i+2]+reg2[1][i+3];
        trans=parseInt(tmp,16);
        if ((trans & 0x8000) > 0) {
          trans = trans - 0x10000;
       }
        trans=trans*0.020926339;
        d2.push(trans);
        tmp='0x'+reg3[1][i]+reg3[1][i+1]+reg3[1][i+2]+reg3[1][i+3];
        trans=parseInt(tmp,16);
        if ((trans & 0x8000) > 0) {
          trans = trans - 0x10000;
       }
        trans=trans*0.020926339;
        d3.push(trans);
      }
      data={
        Data_Point_Amount: jsonData.Data_Point_Amount,
        Date:jsonData.Date,
        Ecg_time:t,
        Current_time:Date.now(),
        Diff_1:d1,
        Diff_2:d2,
        Diff_3:d3,
        Patient_CodeID:jsonData.Patient_CodeID,
        RPN_Id:jsonData.RPN_Id,
        Result:jsonData.Result,
        Message:jsonData.Message,       
      }
      //console.log(data);
       this.ecgrealtime3Service.createEcgrealtime3(data);
       this.userRepository.update({userId:data.Patient_CodeID} , {lasttime_3lead:data.Ecg_time});
       this.userRepository.update({userId:data.Patient_CodeID} , {lasttime_Ts:data.Current_time});
      //console.log(data);
      }
      }).catch((err) => {
      console.log('錯誤:', err);
      });
    await sleep(500);
    check=this.userRepository.findOne({ 'userId': patient_code } );
    }
  }

  async updata3timestamp(params) {
    params.Pateint_CodeID=parseInt(params.Patietn_CodeID);
    params.Ecg_time=params.Ecg_time*1;
    params.Current_time=parseInt(params.Current_time);
    await this.userRepository.update({userId:params.Patient_CodeID} , {lasttime_3lead:params.Ecg_time});
    await this.userRepository.update({userId:params.Patient_CodeID} , {lasttime_Ts:params.Current_time});

  }
}