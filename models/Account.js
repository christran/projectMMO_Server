const accountSchema = new db.mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            index: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        email: {
            type: String,
            // required: true,
            default: ''
        },
        isOnline: {
            type: Boolean,
            default: false
        },
        isGM: {
            type: Boolean,
            default: false
        },
        ban: {
            banType: { type: Number, default: 0 },
            banReason: { type: String, default: '' }
        },
        lastLoginDate: {
            type: Date,
            default: Date
        },
        ip: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

accountSchema.statics.getAccount = function(username, callback) {
    return this.model('accounts').findOne({username: username}, callback);
};

accountSchema.statics.getCharacters = function(accountID, callback) {
    this.model('characters').find({accountID: accountID}).sort({createdAt: 'asc'}).exec((err, character) => {
        callback(character);
    });
};

Account = db.mongoose.model("accounts", accountSchema);

module.exports = Account;