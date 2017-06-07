var express = require('express');
var router = express.Router();
var formidable = require('formidable'); 
var PrivateInfoModel = require('../models/PrivateInfoModel');//导入User
var Users = require('../models/UserModel');
var Msg = require('../models/MsgModel');
var ShopModel = require('../models/ShopModel');
var GoodsModel = require('../models/GoodsModel');
var sequelize = require('../models/ModelHead')();



/* GET home page. */
//--------------------消息列表-----------------------------
router.get('/', function(req, res, next){// '/'根目录
  
	loginbean = req.session.loginbean;
   res.locals.loginbean = loginbean;
   loginbean.msgnum = 0;
   if (loginbean.role > 0) {
      cpage = 1;
      if (req.query.cpage) {
        cpage = req.query.cpage;
      }
      pageItem = 3;// 每页显示条目数
      startPoint = (cpage -1)*pageItem;//查询起点位置
      rowCount = 0;
      sumPage = 0;
    //--------------------查询消息列表-----------------
      sqlCount = 'select count(*)  as count from msgs  where toid =?';
       sequelize.query(sqlCount,{replacements:[loginbean.id],type:sequelize.QueryTypes.QUERY}).then(function(rs){
         rsjson = JSON.parse(JSON.stringify(rs[0]));//RowDataPacket转json,再转成json的对象格式
         rowCount = rsjson[0].count;
         sumPage = Math.ceil(rowCount/pageItem);//向下取整 ,Math.floor 向上取整，Math.round 四舍五入
     

   // Msg.findAll({where:{toid:loginbean.id}}).then(function(rs){ 
        sql = 'select m.*,u.nicheng from msgs m,users u where m.toid =? and m.sendid =u.id limit ?,?'; 
        //预编译的做法，?是占位符
         sequelize.query(sql,{replacements:[loginbean.id,startPoint,pageItem],type:sequelize.QueryTypes.QUERY}).then(function(rs){
          //回调执行sql
            sqlupd = 'update users set msgnum = 0 where id = ?';
           // sequelize.query(sqlupd,{replacements:[loginbean.id],type:sequelize.QueryTypes.QUERY}).then(function(rs){
           // 返回给客户端，客户端收到后弹成功，关闭模态框              
              console.log(rs);
              res.render('home/home', {rs:rs[0]});//渲染ejs文件

        //   });
           
          })
      });

   }else{

      res.send('<script>alert("你无权访问此页面");location.href="/";</script>');
     
   }

 
});


//----------------------------个人身份认证-----------------------------
router.post('/privateAuth', function(req, res, next) {
	var form = new formidable.IncomingForm();   //创建二进制上传表单 
    form.encoding = 'utf-8';        //设置编辑 
    form.uploadDir = './public/images/privateauth/';     //设置上传目录 文件会自动保存在这里 
    form.keepExtensions = true;     //保留后缀 
    form.maxFieldsSize = 5 * 1024 * 1024 ;   //文件大小5M 
    form.parse(req, function (err, fields, files) { 
    //fields存放文字，files存放文件、图片
        if(err){ 
            console.log(err); 
            return;
        } 
        //--------------------入库-----------------------------
       loginbean = req.session.loginbean;
       fields.id = loginbean.id;//存放于session
       fields.idphoto=files.idphoto.path.replace('public','');//存放于files
       fields.userphoto=files.userphoto.path.replace('public','');//存放于files
       fields.updtime=new Date();//存放于Date();
      //------------启动事物-------回调陷阱---------------------------
       sequelize.transaction().then(function (t) {
           return PrivateInfoModel.create(fields).then(function(rs){
            //------修改User表中的role为2------
            return Users.update({role:2},{where:{'id':loginbean.id}}).then(function(rs){
              loginbean.role = 2;
              req.session.loginbean = loginbean;
             // console.log(rs);
              res.send('身份认证已提交,请耐心等待审核');
            });
          }).then(t.commit.bind(t)).catch(function(err){
            t.rollback.bind(t);
            console.log(err);
            if(err.errors[0].path=='PRIMARY'){
              res.send('你已经申请过');
            }else if(err.errors[0].path=='idcodeuniq')
            {
              res.send('身份证号已用过');
            }else if(err.errors[0].path=='prphoneuniq'){
              res.send('电话号码已用过');
            }else if(err.errors[0].path=='premailuniq'){
              res.send('此email已用过');
            }else{
              res.send('数据库错误,稍后再试');
            }
          })
          
        });
      //-----------------结束事物---------------------------------------
  })
 
})
//------------------加载地图-------------------
router.get('/pubShop', function(req, res, next) {
    loginbean = req.session.loginbean;
    sqlSelect = 'select id,typename from shoptypes ';
  
    sequelize.query(sqlSelect).then(function(rs){
     res.render('home/pubShop', {shoptypeRs:rs[0]});

  
    })
   
});

//-------------------------提交店铺信息-------------------------------------
router.post('/pubShop', function(req, res, next) {
    var  form = new formidable.IncomingForm();   //创建二进制上传表单 
    form.encoding = 'utf-8';        //设置编辑 
    form.uploadDir = './public/images/privateauth/';     //设置上传目录 文件会自动保存在这里 
    form.keepExtensions = true;     //保留后缀 
    form.maxFieldsSize = 5 * 1024 * 1024 ;   //文件大小5M 
    form.parse(req, function (err, fields, files) { 
    //fields存放文字，files存放文件、图片
        if(err){ 
            console.log(err); 
            return;
        } 
        //--------------------入库-----------------------------
       loginbean = req.session.loginbean;
       fields.uid = loginbean.id;//存放于session
       fields.photourl=files.photourl.path.replace('public','');//存放于files
      //------------启动事物-------回调陷阱---------------------------
       sequelize.transaction().then(function (t) {
           return ShopModel.create(fields).then(function(rs){
            //------修改User表中的role为2------
            return Users.update({role:4},{where:{'id':loginbean.id}}).then(function(rs){
              loginbean.role = 4;
              req.session.loginbean = loginbean;
              console.log(rs);
              res.redirect('./shopmanage');
            });
          }).then(t.commit.bind(t)).catch(function(err){
            t.rollback.bind(t);
            console.log(err);
            res.send('店铺发布失败，请重新提交');
          })
          
      });
})
})


router.get('/shopmanage', function(req, res, next) {
  //---------------------判定权限---------------------------------------------------------
  loginbean = req.session.loginbean;
  loginbean.msgnum = 0;
    page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
  pageItem = 3;// 每页显示条目数
  startPoint = (cpage -1)*pageItem;//查询起点位置
  rowCount = 0;
  sumPage = 0;
  if (loginbean.role ==4 ) {
     //-----------------------查询出店铺位置信息--先管安全------------------------------------
  sql = 'select * from shops where uid = ?';
  //--------------------------------------回调地狱-sequelize嵌套------------------------------------------------
  sequelize.query(sql,{replacements:[loginbean.id]}).then(function(shopRs){
  //--------------------用店铺信息渲染地图界面---------------------------------------------v  
     sqlSelect = 'select id,typename from shoptypes ';
     sequelize.query(sqlSelect).then(function(shoptypeRs){
       //-----------------------------------查询店铺中的商品信息---------------------------------------------------
      sqlCount = 'select count(*)  as count from goods  where uid =?';
       sequelize.query(sqlCount,{replacements:[loginbean.id],type:sequelize.QueryTypes.QUERY}).then(function(countRs){
         rsjson = JSON.parse(JSON.stringify(countRs[0]));//RowDataPacket转json,再转成json的对象格式
         rowCount = rsjson[0].count;
         sumPage = Math.ceil(rowCount/pageItem);//向下取整 ,Math.floor 向上取整，Math.round 四舍五入 
         GoodsModel.findAll({where:{uid:loginbean.id},offset:(page-1)*pageItem,limit:pageItem}).then(function(goodsRs){
          sumPage = Math.ceil(rowCount/pageItem);
          console.log(shopRs[0]);
           res.render('home/shopmanage', {shoptypeRs:shoptypeRs[0],shopRs:shopRs[0],goodsRs:goodsRs,countRs:countRs,tagflag:req.query.tagflag});
         })
       })

            }) 
     
      });
//--------------------------------------------------------jquery方法-------------------------------------------------------
      //  page = 1;
      //  if (req.query.page) {
      //   page = req.query.page;
      //  }
      //  pageSize = 2;
      // // sumPage = 0;
      //  GoodsModel.count({where:{uid:loginbean.id}}).then(function(countRs){
      //    GoodsModel.findAll({where:{uid:loginbean.id},offset:(page-1)*pageSize,limit:pageSize}).then(function(goodsRs){
      //     sumPage = Math.ceil(rowCount/pageItem);
      //     console.log(shopRs[0]);
      //      res.render('home/shopmanage', {shoptypeRs:shoptypeRs[0],shopRs:shopRs[0],goodsRs:goodsRs,countRs:countRs});
      //    })
      //  })//-- GoodsModel.count

   //  }}//--- sequelize.query(sqlSelect)
   // })//-----sequelize.query(sql
//----------------------------------------------end-------------------------------------------------------------------------
   }else{
      res.send('请先发布您的营业点');
     // res.send('<script>alert("你无权访问此页面");location.href="/";</script>');

   }
});

//-------------------------修改店铺信息-------------------------------------
router.post('/shopModify', function(req, res, next) {
    var  form = new formidable.IncomingForm();   //创建二进制上传表单 
    form.encoding = 'utf-8';        //设置编辑 
    form.uploadDir = './public/images/privateauth/';     //设置上传目录 文件会自动保存在这里 
    form.keepExtensions = true;     //保留后缀 
    form.maxFieldsSize = 5 * 1024 * 1024 ;   //文件大小5M 
    form.parse(req, function (err, fields, files) { 
    //fields存放文字，files存放文件、图片
        if(err){ 
            console.log(err); 
            return;
        } 
        //--------------------入库-----------------------------
       loginbean = req.session.loginbean;
       fields.uid = loginbean.id;//存放于session
       fields.photourl=files.photourl.path.replace('public','');//存放于files

      //------------启动事物-------回调陷阱---------------------------
       
           ShopModel.update(fields,{where:{'uid':loginbean.id}}).then(function(rs){
            //------修改User表中的role为2------
           
              console.log(rs);

              res.redirect('./shopmanage');
          }).catch(function(err){
            console.log(err);
            res.send('店铺修改失败，请重新提交');
          })
          
      });
})



//-------------------------提交关停信息-------------------------------------
router.post('/shpeStopause', function(req, res, next) {
        //--------------------入库-----------------------------
      var flag=0;
       loginbean = req.session.loginbean;
       stopReason = req.body.stopReason;
       console.log(stopReason);
       //------修改shops表中的liveflag为2------      
       sql = 'update shops set liveflag = 1 ,stopReason = ? where uid = ? '
       sequelize.query(sql,{replacements:[stopReason,loginbean.id],type:sequelize.QueryTypes.QUERY}).then(function(rs){
          
          // 返回给客户端，客户端收到后弹成功，关闭模态框      
                flag++;
                if (flag == 0){     
                 res.send('1');
                } 

          console.log(rs);
          res.redirect('./shopmanage');
        });
     
})

//-------------------------提交商品信息-------------------------------------
router.post('/pubgoods', function(req, res, next) {
    var form = new formidable.IncomingForm();   //创建上传表单 
    form.encoding = 'utf-8';        //设置编辑 
    form.uploadDir = './public/images/goods/';     //设置上传目录 文件会自动保存在这里 
    form.keepExtensions = true;     //保留后缀 
    form.maxFieldsSize = 5 * 1024 * 1024 ;   //文件大小5M 
    form.parse(req, function (err, fields, files) { 
        if(err){ 
            console.log(err); 
            return;
        } 
       //-----------入库------------
       loginbean = req.session.loginbean;
       fields.uid = loginbean.id;
       fields.goodsimg=files.goodsimg.path.replace('public','');
       // console.log('----------------------');
       // console.log(fields.editorValue);
       // console.log('----------------------');
       fields.goodsintro=fields.editorValue;
       fields.createtime=new Date();
       //------------启动事物----------------------------------
       GoodsModel.create(fields).then(function(rs){
          console.log(rs);
          res.redirect('./shopmanage?tagflag = 1');
       }).catch(function(err){
          console.log(err);
          res.send('创建失败');
       })
       
      //-----------------结束事物---------------------------------------
    })
})
//-----------------------------修改商品查库----------------------------------------------

router.get('/getGoodsInfo', function(req, res, next) {
    goodsid = req.query.id;
    GoodsModel.findOne({where:{id:goodsid}}).then(function(goodsInfo){ 
        console.log(goodsInfo);        
        res.send(goodsInfo);
        
    })

});
//-------------------------修改商品信息入库-------------------------------------
router.post('/updgoods', function(req, res, next) {

 // var goodsid = req.query.id;//前端?传输的id用query接收
 
  console.log('-------------------修改商品信息入库----------------------');
   var  form = new formidable.IncomingForm();   //创建二进制上传表单 
    form.encoding = 'utf-8';        //设置编辑 
    form.uploadDir = './public/images/privateauth/';     //设置上传目录 文件会自动保存在这里 
    form.keepExtensions = true;     //保留后缀 
    form.maxFieldsSize = 5 * 1024 * 1024 ;   //文件大小5M 
    form.parse(req, function (err, fields, files) { 
    //fields存放文字，files存放文件、图片
        if(err){ 
            console.log(err); 
            return;
        } 
        //--------------------入库-----------------------------
       loginbean = req.session.loginbean;
       fields.uid = loginbean.id;//存放于session
       if (files.goodsimg.name) {
          fields.goodsimg=files.goodsimg.path.replace('public','');//存放于files
       }else{
          fields.goodsimg=files.oldGoodsImg;
          console.log(fields.goodsimg);
       }
       console.log('----------------------');
       console.log(fields.editorValue);
       console.log('----------------------');
       
       fields.goodsintro=fields.editorValue;
       fields.goodsid = fields.goodsid;
  

      //------------启动事物-------回调陷阱---------------------------
       
           GoodsModel.update(fields,{where:{'id':goodsid}}).then(function(rs){
            //------修改User表中的role为2------
               console.log('修改成功');
              console.log(rs);

              res.redirect('./shopmanage?tagflag = 1');
          }).catch(function(err){
            console.log(err);
            res.send('商品修改失败，请重新提交');
          })
          
      });
})




//-----------------------------删除商品信息----------------------------------------
router.get('/deleteGoods', function(req, res, next) {
    loginbean = req.session.loginbean;
    res.locals.loginbean = loginbean;
    id = req.query.id;
    //---------------------sequelize写法 ---------------------------
    GoodsModel.destroy({'where':{'id':id}}).then(function(rs){
    //将表内对应id的记录删除  
       console.log('删除成功');
     
     if(loginbean.role > 0){//判断登录的角色，跳转到相应的页面
        res.redirect('/home/shopmanage');
     }else{
        res.redirect('/admin');
     }
    })     

})


module.exports = router;
