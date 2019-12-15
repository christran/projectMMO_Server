var characterSchema = new db.mongoose.Schema(
    {
        accountID: { type: String, required: true},
        worldId: Number,
        name: { type: String, required: true, unique: true },
        female: Boolean,
        skin: Number,
        hair: Number,
        eyes: Number,
        
        mapID: { type: Number, default: 1 },
        mapPos: Number,
        
        stats: {
            level: { type: Number, default: 1 },
            job: Number,
            str: Number,
            dex: Number,
            int: Number,
            luk: Number,
            hp: Number,
            mhp: { type: Number, min: 1 },
            mp: Number,
            mmp: { type: Number, min: 1 },
            ap: Number,
            sp: Number,
            exp: { type: Number, default: 0 },
            fame: Number,
        },
        
        inventory: {
            mesos: { type: Number, default: 0 },
            maxSlots: Array
        }
    },
    {
        timestamps: true
    }
);

characterSchema.statics.getChar = function(name, callback) {
    return this.model('characters').findOne({name: name}, callback);
};

characterSchema.statics.getCharacters = function(accountID, callback) {
    this.model('characters').find({accountID: accountID}).sort({createdAt: 'asc'}).exec((err, character) => {
        callback(character);
    });
};

Character = db.mongoose.model("characters", characterSchema);

module.exports = Character;