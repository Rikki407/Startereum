const express = require('express'),
    router = express.Router(),
    ethUtil = require('ethereumjs-util'),
    nodemailer = require('nodemailer'),
    User = require('../models/User-model');

console.log(process.env.GMAIL_PASSWORD);

//==Email Verification===
const smtpTransport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    auth: {
        type: 'login', // default
        user: 'rishablamba407@gmail.com',
        pass: process.env.PASSWORD
    }
});

router.get('/verify', function(req, res) {
    User.findById(req.query.id, (err, user) => {
        if (user) {
            console.log(req.protocol + ':/' + req.get('host'));
            if (req.protocol + '://' + req.get('host') === 'http://' + host) {
                console.log(
                    'Domain is matched. Information is from Authentic email'
                );
                user.active = true;
                req.session.active = true;
                console.log('email is verified' + req.session.active);
                user.save(err => {
                    if (err) {
                        res.send(err);
                    } else {
                        console.log('User Account activated');
                        res.redirect('/');
                    }
                });
            }
        } else {
            res.send('<h1>Request is from unknown source</h1>');
        }
    });
});
router.get('/activateAccount', (req, res) => {
    res.render('activateAccount');
});
//=======================

//==============
//Routes
//==============

router.get('/', (req, res) => {
    res.render('home');
});

router.get('/register', (req, res) => {
    res.render('register');
});

const verifySignature = (publicAddress, nonce, signature) => {
    const msg = `I am signing my one-time nonce: ${nonce}`;

    const msgBuffer = ethUtil.toBuffer(msg);
    const msgHash = ethUtil.hashPersonalMessage(msgBuffer);
    console.log(signature);
    const signatureBuffer = ethUtil.toBuffer(signature);
    const signatureParams = ethUtil.fromRpcSig(signatureBuffer);
    const publicKey = ethUtil.ecrecover(
        msgHash,
        signatureParams.v,
        signatureParams.r,
        signatureParams.s
    );
    const addressBuffer = ethUtil.publicToAddress(publicKey);
    const address = ethUtil.bufferToHex(addressBuffer);

    // The signature verification is successful if the address found with
    // ecrecover matches the initial publicAddress
    if (address.toLowerCase() === publicAddress.toLowerCase()) {
        return true;
    }
    return false;
};
router.post('/register', (req, res, next) => {
    console.log('Hey Bitch');
    if (req.body.email && req.body.password) {
        console.log('hehehehe' + req.body.password);
        const userData = {
            email: req.body.email,
            password: req.body.password
        };
        //use schema.create to insert data into the db
        User.create(userData, (err, user) => {
            if (err) {
                return next(err);
            }
            req.session.userId = user._id;
            host = req.get('host');
            const link = 'http://' + req.get('host') + '/verify?id=' + user._id;
            const mailOptions = {
                to: user.email,
                subject: 'Please confirm your Email account',
                html: `Hello,<br> Please Click on the link to verify your email.<br><a href=
                    ${link}
                    >Click here to verify</a>`
            };
            console.log(mailOptions);
            smtpTransport.sendMail(mailOptions, function(error, response) {
                if (error) {
                    console.log(error);
                    res.end('error');
                } else {
                    console.log('Message sent: ' + response.message);
                    res.end('sent');
                }
            });
            return res.redirect('/activateAccount');
        });
    } else if (req.body.ethAddress && req.body.nonce && req.body.signature) {
        const userData = {
            ethAddress: req.body.ethAddress,
            email: req.body.email
        };
        if (
            verifySignature(
                req.body.ethAddress,
                req.body.nonce,
                req.body.signature
            )
        ) {
            User.create(userData, (err, user) => {
                if (err) {
                    console.log(err);
                    return res.send({ redirect: '/register' });
                }
                req.session.userId = user._id;
                return res.send({ redirect: '/' });
            });
        }
    } else {
        return res.send({ redirect: '/qefuwhwgr' });
    }
});
//Login Routes
router.get('/login', (req, res) => {
    res.render('login');
});
router.post('/login', (req, res, next) => {
    if (req.body.email && req.body.password) {
        User.authenticate(req.body.email, req.body.password, (error, user) => {
            if (error || !user) {
                const err = new Error('Wrong email or password.');
                err.status = 401;
                return next(err);
            }
            req.session.userId = user._id;
            req.session.active = user.active;
            return res.redirect('/game');
        });
    } else if (req.body.ethAddress && req.body.nonce && req.body.signature) {
        User.ethAddressAuthenticate(
            req.body.ethAddress,
            req.body.signature,
            req.body.nonce,
            (error, user) => {
                if (error || !user) {
                    const err = new Error('Wrong email or password.');
                    err.status = 401;
                    return next(err);
                }
                req.session.userId = user._id;
                return res.send({ redirect: '/game' });
            }
        );
    }
});

module.exports = router;
