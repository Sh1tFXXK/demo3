const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');


const bodyParser = require('body-parser');
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use(express.urlencoded({extended: false}));

app.use(bodyParser.json());

// 连接到 MongoDB 数据库
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// 用户模型
const UserSchema = new mongoose.Schema({
  username:  String,
  log: [{
    description: String,
    duration: Number,
    date: Date
  }],
  _id: String,
},{versionKey: false});
const User = mongoose.model('User', UserSchema);

// 创建新用户
app.post('/api/users', async (req, res) => {
  const  username  = req.body.username;
  const newUser = new User({ username}  );
  newUser._id = new mongoose.Types.ObjectId();
  await newUser.save();
  res.json({ username: newUser.username, _id: newUser._id });
});


// 获取所有用户
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, { username: 1 });
  res.json(users);
});
// 添加运动记录
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // 确保 log 是一个数组
    if (!Array.isArray(user.log)) {
      user.log = [];
    }
    // 创建新的运动记录
    const exerciseDate = date ? new Date(date) : new Date();
    const newExercise = {
      description,
      duration: Number(duration),
      date: exerciseDate
    };
    // 将新的运动记录添加到 log 数组中
    user.log.push(newExercise);
    // 保存用户对象
    await user.save();
    // 构建响应对象
    const responseExercise = {
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id
    };
    res.json(responseExercise);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 获取用户日志
// 获取用户日志
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 检查 log 是否为数组
    if (!Array.isArray(user.log)) {
      return res.status(500).json({ error: 'Log is not an array' });
    }

    // 解析 log 属性
    let parsedLogs = user.log.map(log => ({
      description: log.description,
      duration: log.duration,
      date: log.date.toDateString() // 将日期转换为字符串
    }));

    // 应用过滤条件
    if (from) {
      const fromDate = new Date(from);
      parsedLogs = parsedLogs.filter(log => new Date(log.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      parsedLogs = parsedLogs.filter(log => new Date(log.date) <= toDate);
    }

    if (limit) {
      parsedLogs = parsedLogs.slice(0, parseInt(limit));
    }

    const responseLog = {
      username: user.username,
      count: parsedLogs.length,
      _id: user._id,
      log: parsedLogs
    };

    res.json(responseLog);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
