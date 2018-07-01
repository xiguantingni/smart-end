var express = require('express');
var app = express();
var query = require('./query');
var request = require('request'); 
var http = require('http');
var https = require('https');
var fs = require('fs');
var bodyParser = require('body-parser');
 
// 添加中间件
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// 证书option
var sslOption = {
	key: fs.readFileSync('./ssl/1530906944686.key'),
	cert: fs.readFileSync('./ssl/1530906944686.pem')
}

// 启动服务--1
// var server = app.listen(3389, function () {
//   	console.log("服务已开启，访问：localhost:3389")
// });

// 启动服务--http
// http.createServer(app).listen(3389, function() {
// 	console.log("服务已开启，访问：localhost:3389")
// });

// 启动服务--https
https.createServer(sslOption, app).listen(3389, function() {
	console.log("服务已开启，访问：localhost:3389")
});

// 路由
app.get('/', function (req, res) {
   	res.send('test: Hello World');
})

// 测试
app.get('/test', function (req, res) {
   	res.send('接口测试。');
})

// 登录
// 该接口用于：1，登录。  2，初始化数据库。
app.get('/login', function (req, res) {
	console.log('开始登陆');
	var code = req.query.code;
	request.get({
		url: 'https://api.weixin.qq.com/sns/jscode2session?appid=wxcf43740db2d1c4ae&secret=9518f6f2b954e7c6c098279eedb67437&js_code=' + code + '&grant_type=authorization_code',
		form: {}
	}, function(err, response, body) {
		if (!err && response.statusCode === 200) {
			var defaultValue = {
				trip: [],
				contact: [],
				orderrecord: [],
				message: [],
				phone: '',
				advice: [],
				account: {}
			};
			var openid = JSON.parse(body).openid;
			
			// 查询记录
			query(`select * from mainuser where id = "${openid}"`, function(err, ret) {
				if (ret && ret[0]) {
					res.send({
						openid: openid,
						code: '0',
						msg: '登录成功！',
						data: {
							trip: JSON.parse(ret[0].trip),
							contact: JSON.parse(ret[0].contact),
							orderrecord: JSON.parse(ret[0].orderrecord),
							message: JSON.parse(ret[0].message),
							phone: ret[0].phone || "",
							advice: JSON.parse(ret[0].advice),
							account: JSON.parse(ret[0].account),
						}
					});
				} else {
					query(`insert into mainuser(id, trip, contact, orderrecord, message, phone, advice, account) values("${openid}", "[]", "[]", "[]", "[]", "", "[]", "{}")`, function(err1, ret1) {
						if (!err1) {
							res.send({
								openid: openid,
								code: '0',
								msg: '登录成功！',
								data: defaultValue
							});
						}
					});
				}
			});
		}
	})
});

// 查询某个用户的所有信息
app.get('/user', function(req, res) {
	query('select * from mainuser;', function(err, result) {
		if (err) {
			console.error(err)
		}
		res.send(result)
	})
})

// 添加行程
app.post('/addTrip/', function(req, res) {

	query(`select trip from mainuser where id = '${req.body.openid}'`, function(err, ret) {
		if (err) {
			console.log('查询失败')
			res.send({
				ret: 'error',
				msg: '新增行程前，查询出错。'
			})
			return;
		}
		var tripObj = JSON.parse(ret[0].trip)
		tripObj.push({
			destination: req.body.destination,
			remark: req.body.remark,
			id: req.body.id,
			date: req.body.date
		})

		console.log(`update mainuser set trip='${JSON.stringify(tripObj)}' where id = '${req.body.openid}';`)

		query(`update mainuser set trip='${JSON.stringify(tripObj)}' where id = '${req.body.openid}';`, function(err, result) {
			if (err) {
				res.send({
					ret: 'error',
					msg: '新增行程，插入出错。'
				})
				return;
			}
			res.send({
				ret: 'success',
				trip: tripObj
			});
		})
	})
});

// 为某个行程添加任务
app.post('/addTask/', function(req, res) {
	// 所需参数，oponid, tripid
	var openid = req.body.openid;
	var tripid = req.body.tripid;
	var task   = req.body.task;
	var name   = req.body.contactName;
	var remark = req.body.remark;

	if (!openid || !tripid || !task instanceof Array) {
		console.log('前端参数错误');
	}

	query(`select trip from mainuser where id = '${openid}'`, function(err, ret) {
		if (!err) {
			var tripObj = JSON.parse(ret[0].trip);
			for(var i=0; i<tripObj.length; i++) {
				if (tripObj[i].id === tripid) {
					if (!tripObj[i].taskDetail) {
						tripObj[i].taskDetail = []
					}
					tripObj[i].taskDetail.push({
						name: name,
						remark: remark,
						task: task
					});
				}
			}

			query(`update mainuser set trip='${JSON.stringify(tripObj)}' where id = '${openid}';`, function(err1, result) {
				if (!err1) {
					res.send({
						code: '0',
						trip: tripObj,
						msg: '行程任务新增成功'
					});
				}
			})
		}
	});
});

// 添加联系人
app.post('/addContact/', function(req, res) {
	// 所需参数，oponid
	var openid = req.body.openid;
	var id     = req.body.id;
	var name   = req.body.name;
	var phone  = req.body.phone;
	var remark = req.body.remark;

	if (!openid || !id || !name) {
		console.log('前端参数错误');
	}

	query(`select contact from mainuser where id = '${openid}'`, function(err, ret) {
		if (!err) {
			var contactArr = JSON.parse(ret[0].contact);
			contactArr.push({
				id: id,
				name: name,
				phone: phone,
				remark: remark
			});

			query(`update mainuser set contact='${JSON.stringify(contactArr)}' where id = '${openid}';`, function(err1, result) {
				if (!err1) {
					res.send({
						code: '0',
						contact: contactArr,
						msg: '联系人新增成功'
					});
				}
			})
		}
	});
});

// 编辑联系人
app.post('/editContact/', function(req, res) {
	// 所需参数，oponid
	var openid = req.body.openid;
	var id     = req.body.id;
	var name   = req.body.name;
	var phone  = req.body.phone;
	var remark = req.body.remark;

	if (!openid || !id || !name) {
		console.log('前端参数错误');
	}

	query(`select contact from mainuser where id = '${openid}'`, function(err, ret) {
		if (!err) {
			var contactArr = JSON.parse(ret[0].contact);
			for(var i=0; i<contactArr.length; i++) {
				if (contactArr[i].id === id) {
					contactArr[i].name = name;
					contactArr[i].phone = phone;
					contactArr[i].remark = remark;
					break;
				}
			}

			query(`update mainuser set contact='${JSON.stringify(contactArr)}' where id = '${openid}';`, function(err1, result) {
				if (!err1) {
					res.send({
						code: '0',
						contact: contactArr,
						msg: '联系人修改成功'
					});
				}
			})
		}
	});
});

// 删除联系人
app.post('/deleteContact/', function(req, res) {
	// 所需参数，oponid
	var openid = req.body.openid;
	var id     = req.body.id;

	if (!openid || !id) {
		console.log('前端参数错误');
	}

	query(`select contact from mainuser where id = '${openid}'`, function(err, ret) {
		if (!err) {
			var contactArr = JSON.parse(ret[0].contact);
			contactArr = contactArr.filter(function(item) {
				return item.id !== id;
			});

			query(`update mainuser set contact='${JSON.stringify(contactArr)}' where id = '${openid}';`, function(err1, result) {
				if (!err1) {
					res.send({
						code: '0',
						contact: contactArr,
						msg: '联系人删除成功'
					});
				}
			})
		}
	});
});


// 查询快递单号
app.get('/queryCourierNumber/', function(req, res) {
	// 所需参数，oponid
	var openid = req.query.openid;
	var courierNumber     = req.query.courierNumber;

	if (!openid || !courierNumber) {
		console.log('前端参数错误');
	}

	res.send({
		code: '0',
		msg: '快递信息查询成功',
		courierInfo: {
				"resultcode": "200", /* 老版状态码，新用户请忽略此字段 */
				"reason": "查询物流信息成功",
				"result": {
				  "company": "EMS", /* 快递公司名字 */
				  "com": "ems",
				  "no": "1186465887499", /* 快递单号 */
				  "status": "1", /* 1表示此快递单的物流信息不会发生变化，此时您可缓存下来；0表示有变化的可能性 */
				  "list": [
					   {
					      "datetime": "2016-06-15 21:44:04",  /* 物流事件发生的时间 */
					      "remark": "离开郴州市 发往长沙市【郴州市】", /* 物流事件的描述 */
					      "zone": "" /* 快件当时所在区域，由于快递公司升级，现大多数快递不提供此信息 */
					    },
					    {
					      "datetime": "2016-06-15 21:46:45",
					      "remark": "郴州市邮政速递物流公司国际快件监管中心已收件（揽投员姓名：侯云,联系电话:）【郴州市】",
					      "zone": ""
					    },
					    {
					      "datetime": "2016-06-16 12:04:00",
					      "remark": "离开长沙市 发往贵阳市（经转）【长沙市】",
					      "zone": ""
					    },
					    {
					      "datetime": "2016-06-18 12:01:00",
					      "remark": "到达  纳雍县 处理中心【毕节地区】",
					      "zone": ""
					    },
					    {
					      "datetime": "2016-06-18 17:34:00",
					      "remark": "离开纳雍县 发往纳雍县阳长邮政支局【毕节地区】",
					      "zone": ""
					    },
					    {
					      "datetime": "2016-06-20 17:55:00",
					      "remark": "投递并签收，签收人：单位收发章 *【毕节地区】",
					      "zone": ""
					    }
				    ]
				  },
				  "error_code": 0 /* 错误码，0表示查询正常，其他表示查询不到物流信息或发生了其他错误 */
		}
	})
});

// 发短信
app.post('/sendMessage/', function(req, res) {
	// 所需参数，oponid, message, contact
	var openid  = req.body.openid;
	var content = req.body.content;
	var name    = req.body.name;
	var phone   = req.body.phone;

	if (!openid || !content || !phone) {
		console.log('前端参数错误');
	}

	query(`select message from mainuser where id = '${openid}'`, function(err, ret) {
		if (!err) {
			var messageArr = JSON.parse(ret[0].message) || [];
			messageArr.push({
				name: name,
				phone: phone,
				content: content
			})

			query(`update mainuser set message='${JSON.stringify(messageArr)}' where id = '${openid}';`, function(err1, result) {
				if (!err1) {
					res.send({
						code: '0',
						message: messageArr,
						msg: '短信发送成功'
					});
				}
			})
		}
	});
});

// 绑定手机号
app.post('/bindphone/', function(req, res) {
	// 所需参数，oponid, phone
	var openid  = req.body.openid;
	var phone = req.body.phone;

	if (!openid || !phone) {
		console.log('前端参数错误');
	}

	query(`select phone from mainuser where id = '${openid}'`, function(err, ret) {
		if (!err) {

			query(`update mainuser set phone='${phone}' where id = '${openid}';`, function(err1, result) {
				if (!err1) {
					res.send({
						code: '0',
						phone: phone,
						msg: '手机号码绑定成功'
					});
				}
			})
		}
	});
});

// 发送建议
app.post('/sendadvice/', function(req, res) {
	// 所需参数，oponid
	var openid = req.body.openid;
	var advice = req.body.advice;

	if (!openid || !advice) {
		console.log('前端参数错误');
	}

	query(`select advice from mainuser where id = '${openid}'`, function(err, ret) {
		if (!err) {
			var adviceArr = JSON.parse(ret[0].advice);
			adviceArr.push(advice);

			query(`update mainuser set advice='${JSON.stringify(adviceArr)}' where id = '${openid}';`, function(err1, result) {
				if (!err1) {
					res.send({
						code: '0',
						advice: adviceArr,
						msg: '建议成功'
					});
				}
			})
		}
	});
});
