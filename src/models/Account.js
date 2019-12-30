const uniqueValidator = require('mongoose-unique-validator');

const accountSchema = new db.mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            index: true,
            unique: true,
            uniqueCaseInsensitive: true
        },
        password: {
            type: String,
            required: true
        },
        email: {
            type: String,
            // required: true,
            index: true,
            unique: true,
            uniqueCaseInsensitive: true,
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

accountSchema.plugin(uniqueValidator);

accountSchema.statics.getAccount = async function(username) {
    return await this.model('accounts').findOne({username: username});
};

accountSchema.statics.getAccountByID = async function(accountID) {
    return await this.model('accounts').findOne({_id: accountID});
};

accountSchema.statics.getCharacters = async function(accountID) {
    return await this.model('characters').find({accountID: accountID}).sort({createdAt: 'asc'});
};

Account = db.mongoose.model("accounts", accountSchema);

module.exports = Account;