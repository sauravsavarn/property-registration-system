// This file contains all the business logic for the use-case for user's smart contract functions. 
// This file then get exported to the global namespace and through index.js, it is made available 
// for the property-registration project. This file will be exported to the global namespace.

'use strict';

// Now this fabric contract API, which is a npm module exported or made available by
// the fabrics SDK for node.js, has a Contract class that it exports.This contract 
// class is what makes this nodejs or JavaScript class, mapped to a particular
// format expected by smart contracts inside of the fabric network.
const { Contract } = require('fabric-contract-api');

// define a mapper/object having relationship between the TransactionID & the UpgradConins
const mapperTxnIdNUpgradCoins = {
    "upg100": 100,
    "upg500": 500,
    "upg1000": 1000
}

class UsersContract extends Contract {

    constructor() {
        // as part of the constructor of the contract class, it expects a single argument
        // that you can pass as part of this super and the argument that it expects is the
        // name for this particular smart contract that you want your fabric network to
        // recognize it by. NOTE: this also forms the primary domain with which all of the
        // other assets that you add inside of this smart contract are linked to, which
        // means that, if any point inside of this smart contract, if we define a function
        // to create a new student asset or a certificate asset based on the business logic
        // that we are building, that student or certificate asset would get linked to the
        // global domain name for this smart contract, which would now be 'propertyreg'.  
        super('propertyreg.UsersContract');
    }


    // a. Instantiate
    //      - This function will be triggered or invoked as part of the deployment or commit 
    //        process when the chaincode is deployed on top of a Fabric Network.
    async instantiate(ctx) {
        console.log('User\'s Chaincode is successfully deployed.');
    }

    /* 
     *  ASK : To create the User Assets.
     *  Initiator:  It will be the user. 
     *  Output:     A ‘USER’ asset on the ledger will be the output. 
     *  Use case:   This transaction is called by the user to create the USER assets 
     *              on the property-registration-network.*
    */
    async createUser(ctx, name, emailID, phoneNumber, socialSecurityNumber) {
        console.log("Inside createUser Function");

        // Composite Keys -> 
        const userKey = ctx.stub.createCompositeKey('propertyreg.user', [name, socialSecurityNumber]);

        //first check to see that the User is present into the ledger of peers
        //Fetch User's with the key from the blockchain.
        let user = await ctx.stub.getState(userKey).catch( err => console.log(err) );

        if(user.length != 0) 
            return 'Asset with name ' + name + ' & social-security-number ' +socialSecurityNumber+
                ' already exists, skip overwriting User\'s data';

        const newUserObject = {
            docType: 'user',
            name: name,
            emailID: emailID,
            phoneNumber: phoneNumber,
            socialSecurityNumber: socialSecurityNumber,
            createdAt: ctx.stub.getTxTimestamp(),
            updatedAt: ctx.stub.getTxTimestamp()
        }

        const userBuffer = Buffer.from(JSON.stringify(newUserObject));
        // putState - thie method allows you to store a particular state or an asset on top of the fabric n/w.
        await ctx.stub.putState(userKey, userBuffer);

        // return the User Object newly created.
        return newUserObject;
    }

    /* 
     *  ASK : To create the Request Assets, for the new User.
     *  Initiator:  It will be the user. 
     *  Output:     A ‘Request’ asset on the ledger will be the output. 
     *  Use case:   This transaction is called by the user to request the registrar to register 
     *              them on the property-registration-network.*
    */
    async requestNewUser(ctx, name, emailID, phoneNumber, socialSecurityNumber) {
        // Composite Keys -> 
        const userKey = ctx.stub.createCompositeKey('propertyreg.user', [name, socialSecurityNumber]);

        // First check to see that the user's is present into the ledger of peers or not
        // Fetch user's with the key from the blockchain.
        let user = await ctx.stub.getState(userKey).catch(err => console.log(err));

        if (user.length == 0) return 'Asset with name ' + name + ' & ssn ' + socialSecurityNumber +
            ' does not exists, skip process for NewUser Request and follow to create the User Asset First ' +
            ' on the chain';

        let requestKey;
        if (user.length != 0) {
            // Then check that if the request has already been raised earlier or not.
            // Fetch or View 'request' asset with the key from the blockcahin.
            requestKey = ctx.stub.createCompositeKey('propertyreg.user.request', [name, socialSecurityNumber]);

            // First check to see that the Request's is present as an asset already into the ledger of peers or not
            // Fetch request's with the key from the blockchain.
            let request = await ctx.stub.getState(requestKey).catch(err => console.log(err));

            if (request.length != 0) return 'Asset with name ' + name + ' & ssn ' + socialSecurityNumber +
                ' already exists, skip overwriting User\'s data';
        }

        ////////////// NOTE here we have to check also 1 condition that user 's request is already accepted
        ////////////// so have to SKIP ........ to do later...


        // 
        const newUserRequestObject = {
            docType: 'request',
            name: name,
            emailID: emailID,
            phoneNumber: phoneNumber,
            socialSecurityNumber: socialSecurityNumber,
            createdAt: ctx.stub.getTxTimestamp(),
            updatedAt: ctx.stub.getTxTimestamp()
        }

        // As we Know that data can only be saved over the blokcchain network as bytes/buffers, so
        // converting that JSON to string first and then to the bytes to save over network using
        // Bufer.from method.
        const requestBuffer = Buffer.from(JSON.stringify(newUserRequestObject));

        // putState - this method allows to store a particular state or an asset on top of the fabric n/w.
        await ctx.stub.putState(requestKey, requestBuffer);

        // return the Request Object layout to the caller function.
        return newUserRequestObject;
    }

    /* 
     *  ASK :       To be used to recharge user's account.
     *  Initiator:  It will be the user. 
     *  Output:     Update the user(s) assets with the "UpgradCoin" balances iFF bankTransactionID is CORRECT!!
     *  Use case:   A user initiates this transaction to recharge their account with “upgradCoins”.
    */
    async rechargeAccount(ctx, name, socialSecurityNumber, bankTransactionID) {
        // Composite Keys -> 
        const userKey = ctx.stub.createCompositeKey('propertyreg.user', [name, socialSecurityNumber]);

        // First check to see that the user's is present into the ledger of peers or not
        // Fetch user's with the key from the blockchain. Use function "viewUser" for this.
        let user = await this.viewUser(name, socialSecurityNumber);

        //
        if (!user.startsWith("ERROR") && !user.startsWith("Asset")) {

            // Also, to check that the User(s) initiated the request has already been registered or not.
            // This is done by checking whether the User(s) Assets have key =="upgradConins" or otherwise 
            // skip the process.
            // NOTE: only the registered USER is allowed to call this Function
            if (!user["upgradCoins"]) {
                // This signifies that user is not yet registered, so skip further process
                return false;
            }
        } else {
            // This marks that either there is some issue connecting blockchain or other issue or 
            // either the Asset does not EXISTS!!! . Thus skip further process.
            return false;
        }

        // print logs 
        console.log("Account with the name : " + name + " & social-security-number : " + socialSecurityNumber + "  will be recharged.");

        // get the upgradCoins based on the BankTransactionID else skip the process in case of error
        const amount = this.buyUpgradCoins(bankTransactionID);
        if (isNaN(parseInt(amount))) {
            // decline the transaction and skip further process as no numeric value of coins is received.
            return amount;
        }

        // update the upgradCoins to the User Assets
        user.upgradCoins += amount;

        // Also, update the User's Assets Stae to the peer ledger
        const userBuffer = Buffer.from(JSON.stringify(user));
        // putState - this method allows to store a particular state or an asset on top of the fabric n/w.
        await ctx.stub.putState(userKey, userBuffer);

        // return the User's Json layout to the caller function.
        return user;
    }

    /* 
     *  ASK :       To be used to View/Return User's current state.
     *  Initiator:  It will be the user in case of User(s) SmartContract. 
     *              It will be a separate function in case of Registrar Smart Contract
     *  Output:     Returns the User if exists or otherwise notify such Asset not exists.
     *  Use case:   
    */
    async viewUser(ctx, name, socialSecurityNumber) {
        try {
            // Composite Keys -> 
            const userKey = ctx.stub.createCompositeKey('propertyreg.user', [name, socialSecurityNumber]);

            // First check to see that the user's is present into the ledger of peers or not
            // Fetch user's with the key from the blockchain.
            let user = await ctx.stub.getState(userKey).catch(err => console.log(err));

            if (user.length != 0) {
                return JSON.parse(user.toString());
            } else {
                return 'Asset with name ' + name + ' & ssn ' + socialSecurityNumber +
                    ' having key ' + userKey + ' does not exist on the network';
            }
        } catch (error) {
            return ("ERROR : " + error);
        }
    }

    /* 
     *  ASK :       To be used by User's to request for the property details registration on the 
     *              property-registration network.
     *  Initiator:  It will be the user.
     *  Output:     Returns the "Request" Asset on the ledger.
     *  Use case:   The request should cater iFF the details of the property owner's already registered on the
     *              network, ie. User's Assets should be available
    */
    async propertyRegistrationRequest(ctx, propertyId, ownerName, ownerSSN, propertyPrice /*, propertyStatus*/) {
        // Composite Keys -> 
        const ownerKey = ctx.stub.createCompositeKey('propertyreg.user', [ownerName, ownerSSN]);

        // First check to see that the user's is present into the ledger of peers or not
        // Fetch user's with the key from the blockchain. Use function "viewUser" for this.
        let user = await this.viewUser(ownerName, ownerSSN);

        //
        if (user.startsWith("ERROR") && user.startsWith("Asset")) {

            // This marks that either there is some issue connecting blockchain or other issue or 
            // either the Asset does not EXISTS!!! . Thus skip further process.
            return "Property Registration fails because of the following reasons : " + user;
        }

        // Also, to check that the User(s) initiated the request has already been registered or not.
        // This is done by checking whether the User(s) Assets have key =="upgradConins" or otherwise 
        // skip the process.
        // NOTE: only the registered USER is allowed to proceed further.
        if (!user["upgradCoins"]) {
            // This signifies that user is not yet registered, so skip further process
            return "Property Registration fails because of the following reasons : User is yet not Registered";
        }

        // Also, it is required to check that previously the request is not already raised to register
        // for this property or property is not already registered also.
        // Fetch or View property's 'request' asset with the key from the blockcahin.
        // let requestKey = ctx.stub.createCompositeKey('propertyreg.user.propertyreg.request', [ownerName, ownerSSN, propertyId]);
        let requestKey = ctx.stub.createCompositeKey('propertyreg.user.property', [propertyId]);

        // First check to see that the Request's is present as an asset already into the ledger of peers or not
        // Fetch request's with the key from the blockchain.
        let request = await ctx.stub.getState(requestKey).catch(err => console.log(err));

        if (request.length != 0) return 'Property Registeration Request has already been raised for the' +
            ' property : ' + propertyId + ' by the owner : ' + ownerName + ' having social-security-number : ' +
            ownerSSN;

        // NOTE: Initially the Status of Property if raised to register is 'NA', as from the statement or
        //       use-case the propertyStatus can have only 2 values either 'registered' or 'onSale'.
        const newPropertyRegRequestObject = {
            docType: 'property-registration-request',
            propertyId: propertyId,
            owner: ownerKey,
            price: propertyPrice,
            status: '',
            createdAt: ctx.stub.getTxTimestamp(),
            updatedAt: ctx.stub.getTxTimestamp()
        }

        // As we Know that data can only be saved over the blokcchain network as bytes/buffers, so
        // converting that JSON to string first and then to the bytes to save over network using
        // Bufer.from method.
        const requestBuffer = Buffer.from(JSON.stringify(newPropertyRegRequestObject));

        // putState - this method allows to store a particular state or an asset on top of the fabric n/w.
        await ctx.stub.putState(requestKey, requestBuffer);

        // return the Request Object layout to the caller function.
        return newPropertyRegRequestObject;
    }

    /* 
     *  ASK :       To be used by User's to view/inquire the current state of any property.
     *  Initiator:  It will be the user in case of User(s) SmartContract. 
     *              It will be a separate function in case of Registrar Smart Contract.
     *  Output:     Returns the Property's 'Status' from the ledger.
     *  Use case:   This function should be defined to view the current state of any property registered 
     *              on the ledger.
     * 
     * NOTE: property state can be 'Not Registered' or 'registered' or 'onSale' or otherwise no such assets 
     *       available
    */
    async viewProperty(ctx, propertyId, ownerName, ownerSSN) {
        // Composite Keys -> 
        const ownerKey = ctx.stub.createCompositeKey('propertyreg.user', [ownerName, ownerSSN]);

        // First check to see that the user's is present into the ledger of peers or not
        // Fetch user's with the key from the blockchain. Use function "viewUser" for this.
        let user = await this.viewUser(ownerName, ownerSSN);

        //
        if (user.startsWith("ERROR") && user.startsWith("Asset")) {

            // This marks that either there is some issue connecting blockchain or other issue or 
            // either the Asset does not EXISTS!!! . Thus skip further process.
            return "Unable to fetch User's Asset because of the following reasons : " + user;
        }

        // Also, to check that the User(s) initiated the request has already been registered or not.
        // This is done by checking whether the User(s) Assets have key =="upgradConins" or otherwise 
        // skip the process.
        // NOTE: only the registered USER is allowed to proceed further.
        if (!user["upgradCoins"]) {
            // This signifies that user is not yet registered, so skip further process
            return 'User ' + ownerName + ' having social-security-number : ' + ownerSSN + ' is yet not Registered ' +
                ' hence, property state not exists right now.';
        }

        // Composite Key ->
        //let requestKey = ctx.stub.createCompositeKey('propertyreg.user.propertyreg.request', [ownerName, ownerSSN, propertyId]);
        let requestKey = ctx.stub.createCompositeKey('propertyreg.user.property', [propertyId]);

        // Fetch request's with the key from the blockchain.
        let property = await ctx.stub.getState(requestKey).catch(err => console.log(err));

        if (property.length != 0) {
            let propertyJson = JSON.parse(property.toString());
            return propertyJson['status']; //return the property status only
        }
        else
            return 'Property Asset for owner ' + ownerName + ' having social-security-number ' + ownerSSN +
                ' does not exist on the network';

    }

    /* 
     *  ASK :       To be used by User's to update the current state of property once registered.
     *  Initiator:  It will be a registered user who has their property registered on the ledger.
     *  Output:     
     *  Use case:   This function is invoked to change a property’s status.
    */
    async updateProperty(ctx, propertyId, ownerName, ownerSSN, propertyStatus) {
        // Composite Keys -> 
        const ownerKey = ctx.stub.createCompositeKey('propertyreg.user', [ownerName, ownerSSN]);

        // First check to see that the user's is present into the ledger of peers or not
        // Fetch user's with the key from the blockchain. Use function "viewUser" for this.
        let user = await this.viewUser(ownerName, ownerSSN);

        //
        if (user.startsWith("ERROR") && user.startsWith("Asset")) {

            // This marks that either there is some issue connecting blockchain or other issue or 
            // either the Asset does not EXISTS!!! . Thus skip further process.
            return "Unable to fetch User's Asset because of the following reasons : " + user;
        }

        // Also, to check that the User(s) initiated the request has already been registered or not.
        // This is done by checking whether the User(s) Assets have key =="upgradConins" or otherwise 
        // skip the process.
        // NOTE: only the registered USER is allowed to proceed further.
        if (!user["upgradCoins"]) {
            // This signifies that user is not yet registered, so skip further process
            return 'User ' + ownerName + ' having social-security-number : ' + ownerSSN + ' is yet not Registered ' +
                ' hence, property state not exists right now.';
        }

        // Composite Key ->
        //let requestKey = ctx.stub.createCompositeKey('propertyreg.user.propertyreg.request', [ownerName, ownerSSN, propertyId]);
        let requestKey = ctx.stub.createCompositeKey('propertyreg.user.property', [propertyId]);

        // Fetch request's with the key from the blockchain.
        let property = await ctx.stub.getState(requestKey).catch(err => console.log(err));

        // A non-zero value indicates that the user invoking the function is the property’s owner.
        if (property.length != 0) {
            let propertyJson = JSON.parse(property.toString());

            // First, verifiy whether the user invoking the function is the property’s owner
            if (propertyJson['owner'] != ownerKey)
                return 'Owner ' + ownerName + ' having social-security-number ' + ownerSSN +
                    ' is not the valid owner of the property having propertyId as ' + propertyId +
                    ' . Hence, cannot update the property status';

            // Finally, check if the property is registed or not. Only if it is 'registered' or 'onSale', 
            // it's status allowed to change.
            if (propertyJson['status'] === "registered" || propertyJson['status'] === "onSale") {
                propertyJson['status'] = propertyStatus; //update the status key value

                // As we Know that data can only be saved over the blokcchain network as bytes/buffers, so
                // converting that JSON to string first and then to the bytes to save over network using
                // Bufer.from method.
                const propertyBuffer = Buffer.from(JSON.stringify(propertyJson));

                // putState - call to update the property on the peer's ledger
                await ctx.stub.putState(requestKey, propertyBuffer);

                // return the Status update Notification to the caller.
                return 'Property status is updated';

            } else
                return 'Property Asset for the owner ' + ownerName + ' with social-security-number ' +
                    ownerSSN + ' having propertyId ' + propertyId + ' cannot be updated as the property '
                    + ' registration request still to be approved by the registrar.';

        }
        else
            return 'Property Asset for owner ' + ownerName + ' having social-security-number ' + ownerSSN +
                ' does not exist on the network';

    }

    /* 
     *  ASK :       To be used by User's to buy the property Iff both user & property is registered.
     *  Initiator:  It will be a user registered on the network.
     *  Output:     
     *  Use case:   In this transaction, a user registered on the network can purchase the properties 
     *              that are listed for sale.
    */
    async purchaseProperty(ctx, propertyId, buyerName, buyerSSN) {
        // Composite Keys -> 
        const buyerKey = ctx.stub.createCompositeKey('propertyreg.user', [buyerName, buyerSSN]);

        // First check to see that the user's is present into the ledger of peers or not
        // Fetch user's with the key from the blockchain. Use function "viewUser" for this.
        let buyer = await this.viewUser(buyerName, buyerSSN);

        //
        if (buyer.startsWith("ERROR") && buyer.startsWith("Asset")) {

            // This marks that either there is some issue connecting blockchain or other issue or 
            // either the Asset does not EXISTS!!! . Thus skip further process.
            return "Unable to fetch User's Asset because of the following reasons : " + user;
        }

        // Also, to check that the Buyer(s) initiated the request has already been registered or not.
        // This is done by checking whether the User(s) Assets have key =="upgradConins" or otherwise 
        // skip the process.
        // NOTE: only the registered BUYER is allowed to proceed further.
        if (!buyer["upgradCoins"]) {
            // This signifies that buyer is not yet registered, so skip further process
            return 'User ' + buyerName + ' having social-security-number : ' + buyerSSN +
                ' is yet not Registered. Hence, property state not exists right now.';
        }

        // Composite Key ->
        let requestKey = ctx.stub.createCompositeKey('propertyreg.user.property', [propertyId]);

        // Fetch request's with the key from the blockchain.
        let property = await ctx.stub.getState(requestKey).catch(err => console.log(err));

        // A non-zero value indicates that the Assets exists on the network.
        if (property.length != 0) {
            let propertyJson = JSON.parse(property.toString());

            // Finally, check if the property is registed for sale or not
            if (propertyJson['status'] === "onSale") {

                // Finaly, check the buyer has "upgradCoins" >= PropertyPrice.
                if (buyer['upgradCoins'] < propertyJson['price'])
                    return 'Property having proertyId ' + propertyId + ' cannot be purchased by ' +
                        ' the User ' + buyerName + ' having social-security-number ' + buyerSSN +
                        ' as the buyer has not the sufficient amout to buy the property';

                // Fetch the property seller from the property-json 
                let sellerKey = propertyJson['owner'];

                // fetch the seller of the property using sellerKey
                let seller = await this.fetchUser(sellerKey);

                if (seller.length == 0) return 'Seller of the property having propertyID ' + propertyId +
                    ' cannot be fetched from the network due ' + seller + ' . Please try again.';

                seller['upgradCoins'] += propertyJson['price']; //Increase the upGrad coin for the seller
                buyer['upgradCoins'] -= propertyJson['price']; //Decrease the upGrad coin for the buyer
                propertyJson['status'] = "registered"; //update the status key value

                ///// NOW all seller, buyer & proeprty Assets states to be updated back on the peer
                ///// ledger on the blockchain

                // >1. first updating ledger of property
                const propertyBuffer = Buffer.from(JSON.stringify(propertyJson));
                // putState - call to update the property on the peer's ledger
                await ctx.stub.putState(requestKey, propertyBuffer);

                // >2. Secondly, updating ledger of buyer
                const buyerBuffer = Buffer.from(JSON.stringify(buyer));
                // putState - call to update the property on the peer's ledger
                await ctx.stub.putState(buyerKey, buyerBuffer);

                // >3. Lastly, updating ledger of seller
                const sellerBuffer = Buffer.from(JSON.stringify(seller));
                // putState - call to update the property on the peer's ledger
                await ctx.stub.putState(sellerKey, sellerBuffer);

                // return the Status update Notification to the caller.
                return 'Property ownership is changed and status changed back from onSale to registered';

            } else
                return 'Property having propertyID ' + propertyId + ' is not available for SALE';

        }
        else
            return 'Property Asset having propertyID ' + propertyId + ' does not exist on the network';

    }

    /* 
     *  ASK :       To be used to View/Return User's current state.
     *  Initiator:  It will be the user in case of User(s) SmartContract. 
     *              It will be a separate function in case of Registrar Smart Contract
     *  Output:     Returns the User if exists or otherwise notify such Asset not exists.
     *  Use case:   
    */
    async buyUpgradCoins(bankTransactionID) {
        if (mapperTxnIdNUpgradCoins[bankTransactionID]) {
            console.log("Number of UpgradCoins bought : " + mapperTxnIdNUpgradCoins.bankTransactionID);
            return mapperTxnIdNUpgradCoins.bankTransactionID;
        }
        else
            return "Invalid Bank Transaction ID.";
    }

    /*
     * Helper function to fetch the User based on the compositeKey 
    */
    async fetchUser(ctx, userKey) {
        try {
            // First check to see that the user's is present into the ledger of peers or not
            // Fetch user's with the key from the blockchain.
            let user = await ctx.stub.getState(userKey).catch(err => console.log(err));

            if (user.length != 0) {
                return JSON.parse(user.toString());
            } else {
                return 'false';
            }
        } catch (error) {
            return 'false';
        }
    }
}

// export this contract
module.exports = UsersContract;