const mongoose = require('mongoose');


const voiceMessageSchema = new mongoose.Schema({
    filename: String,
    path: String,
}, {timestamps : true});


const VoiceMessage = mongoose.model('voiceMessages', voiceMessageSchema);


module.exports = VoiceMessage; 