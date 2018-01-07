const mongoose = require('mongoose');

const answersSchema = mongoose.Schema({
	user : String,
	comment : {type: String, required: true}
})

const questionSchema = new mongoose.Schema({
	question : {type: String, required: true},
	topic : {type: String, required: true},
	user : {type: String, required: true},
	comments : [
		{
			type : mongoose.Schema.ObjectId,
			ref : 'AnswerPost'
		}
	],
	date : {type: Date, default: new Date()}
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

answersSchema.methods.apiRepr = function() {
	console.log('bye');
	return {
		id : this._id,
		user : this.user,
		comment : this.comment

	}
}

const QuestionPost = mongoose.model('QuestionPost', questionSchema, 'data');
const AnswerPost = mongoose.model('AnswerPost', answersSchema, 'answers');

module.exports = {QuestionPost,AnswerPost};