var Sequelize = require('sequelize'); 
var sequelize=require('./ModelHead')();
var UserModel = sequelize.define('users',{
	id:{type:Sequelize.BIGINT,
		primaryKey:true
	},
	email:Sequelize.STRING,
	pwd:Sequelize.STRING,
	nicheng:Sequelize.STRING,
	createtime:Sequelize.DATE,
	updtime:Sequelize.DATE,
	role:Sequelize.INTEGER,
	msgnum:Sequelize.INTEGER
	},{
		timestamps: false,
		//paranoid: true  //获取不到id的返回值

});
/*
var user ={
	email:'aa',
		pwd:'aa',
		nicheng:'aa',
		role:1
};*/
// var user =new Object();
// user.email='aa';
// user.pwd='aa';
// user.nicheng='aa';
// user.role=1;
// user.abc='dddddddddddd';



// User.create(user).then(function(result){
// 	console.log('插入成功');
// 	console.log(rs);

// }).catch(function(err){
// 	console.log('插入失败');
// 	console.log(err);
// });
module.exports = UserModel;



