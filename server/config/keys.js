dbPassword = 'mongodb://mongoadmin:' +
    encodeURIComponent(process.env.DRGN_DATABASE_PASSWORD) +
    '@45.85.219.34:27017/dragonfly?authSource=admin&readPreference=primary'

module.exports = {
    mongoURI: dbPassword
}