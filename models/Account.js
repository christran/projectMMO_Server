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
            default: null
        },
        isGM: {
            type: Boolean,
            default: false
        },
        banType: {
            type: Number,
            default: 0
        },
        banReason: {
            type: String,
            default: null
        },
        lastLoginDate: {
            type: Date,
            default: Date
        },
        ip: {
            type: String,
            default: null
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