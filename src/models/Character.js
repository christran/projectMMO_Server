var characterSchema = new db.mongoose.Schema(
    {
        accountID: { type: String, required: true},
        _id: String,
        worldId: Number,
        name: { type: String, required: true, unique: true },
        female: Boolean,
        skin: Number,
        hair: Number,
        eyes: Number,
        
        mapID: { type: Number, default: 1 },
        position: {
            location: { x: Number, y: Number, z: Number },
            rotation: { roll: Number, pitch: Number, yaw: Number }
        },

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

characterSchema.statics.getCharacter = function(name, callback) {
    return this.model('characters').findOne({name: name}, callback);
};

characterSchema.statics.getCharacterByID = function(charID, callback) {
    return this.model('characters').findOne({_id: charID}, callback);
};

characterSchema.statics.saveCharacter = function(socket) {
    this.getCharacter(socket.character.name, (err, character) => {
        if (!character || err) {
            console.log(`[Character] Saving Character | Error: ${err}`);
        } else {
            character = socket.character;
            character.save();
        }
    });
};

Character = db.mongoose.model("characters", characterSchema);

module.exports = Character;