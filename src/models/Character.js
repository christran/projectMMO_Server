const uniqueValidator = require('mongoose-unique-validator');

const characterSchema = new db.mongoose.Schema(
    {
        accountID: { type: String, required: true},
        _id: String,
        worldId: Number,
        name: { type: String, required: true, index: true, unique: true, uniqueCaseInsensitive: true },
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

characterSchema.plugin(uniqueValidator);

characterSchema.statics.getCharacter = async function(name) {
    return await this.model('characters').findOne({name: new RegExp(`^${name}$`, 'i')});
};

characterSchema.statics.getCharacterByID = async function(charID) {
    return await this.model('characters').findOne({_id: charID});
};

characterSchema.statics.saveCharacter = async function(socket) {
    try {
        let saveChar = await socket.character.save();
    } catch (err) {
        console.log(`[World Server] Saving Character | Error ${err}`);
    }
};

Character = db.mongoose.model("characters", characterSchema);

module.exports = Character;