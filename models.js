const mongoose = require('mongoose');


const commentSchema = mongoose.Schema({
	answerid : String
})

const questionSchema = mongoose.Schema({
	question : {type: String, required: true},
	topic : {type: String, required: true},
	user : {type: String, required: true},
	comments : [commentSchema],
	date : {type: Date, default: new Date()},
})

questionSchema.methods.apiRepr = function() {
	console.log(this, 'hello');
  	return {
  	id : this._id,
    user : this.user,
    topic : this.topic,
	question: this.question,
	date: this.date,
	comments: this.comments
	}
}

const QuestionPost = mongoose.model('QuestionPost', questionSchema, 'data');

module.exports = {QuestionPost};