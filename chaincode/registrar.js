// This file contains all the business logic for the use-case for registrar's smart contract functions. 
// This file then get exported to the global namespace and through index.js, it is made available 
// for the property-registration project. This file will be exported to the global namespace.

'use strict';

// Now this fabric contract API, which is a npm module exported or made available by
// the fabrics SDK for node.js, has a Contract class that it exports.This contract 
// class is what makes this nodejs or JavaScript class, mapped to a particular
// format expected by smart contracts inside of the fabric network.
const { Contract } = require('fabric-contract-api');

class RegistrarContract extends Contract {

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
        super('propertyreg.RegistrarContract');
    }

    // a. Instantiate
    //      - This function will be triggered or invoked as part of the deployment or commit 
    //        process when the chaincode is deployed on top of a Fabric Network.
    async instantiate(ctx) {
        console.log('Registrar\'s Chaincode is successfully deployed.');
    }

    /* 
    *  ASK :        To approve the User Requests which have been already raised by the User.
    *  Initiator:   It will be the registrar.
    *  Output:      A ‘User’ asset on the ledger will be the output.
    *  Use case:    The registrar initiates a transaction to register a new user on the ledger 
    *               based on the request received. *
   */
    async approveNewUser(ctx, name, socialSecurityNumber) {

        // Composite Keys -> 
        const userKey = ctx.stub.createCompositeKey('propertyreg.user', [name, socialSecurityNumber]);

        // First check to see that the user's is present into the ledger of peers or not
        // Fetch user's with the key from the blockchain.
        // let user = await this.viewUser(name, socialSecurityNumber);
        let user = await ctx.stub.getState(userKey).catch(err => console.log(err));
        console.log("approveNewUser user : " + user);
        //
        if (user.length==0) {
            // This marks that either there is some issue connecting blockchain or other issue or 
            // either the Asset does not EXISTS!!! . Thus skip further process.
            return 'Asset with name ' + name + ' & ssn ' + socialSecurityNumber +
                ' does not exists, skip process for NewUser Request Approval and ask the User' +
                ' to first register on the chain';
        }

        // create a JSON Object from the user byte data
        let userJson = JSON.parse(user.toString());

        // Secondly, It is required to Check that if the request has already been raised earlier or not.
        // Fetch or View 'request' asset with the key from the blockcahin.
        // Thus creating Composite Key ->
        let requestKey = ctx.stub.createCompositeKey('propertyreg.user.request', [name, socialSecurityNumber]);

        // Check to see that the Request's is present as an asset already into the ledger of peers or not
        // Fetch request's with the key from the blockchain.
        let request = await ctx.stub.getState(requestKey).catch(err => console.log(err));

        if (request.length == 0) return 'Asset with name ' + name + ' & ssn ' + socialSecurityNumber +
            ' do not exists and not available to approve.';

        // Use Json.parse & toString() methods to convert the byte to first to string and then to JSON Object.
        let userRequestJson = JSON.parse(request.toString());

        userRequestJson.upgradCoins = 0; //adding field named “upgradCoins” as an attribute to the JSON Object

        // Also, update the User Asset, adding field named “upgradCoins” as an attribute to the JSON Object
        userJson.upgradCoins = 0;

        /* ******************************************************** */
        /// 1=> First, call to update the REQUEST Asset

        // Finally, call to update the peer's ledger. As we Know that data can only be saved over the 
        // blokcchain network as bytes/buffers, so converting that JSON to string first and then to 
        // the bytes to save over network using Bufer.from method.
        const requestBuffer = Buffer.from(JSON.stringify(userRequestJson));
        // putState - this method allows to store a particular state or an asset on top of the fabric n/w.
        await ctx.stub.putState(requestKey, requestBuffer);

        /// 2=> Secondly, call to update the USER Asset also
        const userBuffer = Buffer.from(JSON.stringify(userJson));
        // putState - this method allows to store a particular state or an asset on top of the fabric n/w.
        await ctx.stub.putState(userKey, userBuffer);

        /* ******************************************************** */

        // return the Request Object layout to the caller function.
        return userRequestJson;
    }


    /* 
        *  ASK :        To approve the Property Registration Requests which have been already raised by the User.
        *  Initiator:   It will be the registrar.
        *  Output:      A ‘Property’ asset on the ledger will be the output. 
        *  Use case:    The registrar uses this function to create a new “Property” asset on the 
        *               network after performing certain manual checks on the request received for 
        *               property registration. *
       */
    async approvePropertyRegistration(ctx, propertyId) {

        // Firstly, it is required to Fetch property's 'request' asset using the key from the blockchain.
        // creating CompositeKeys ->
        let requestKey = ctx.stub.createCompositeKey('propertyreg.user.property', [propertyId]);

        // First check to see that the Request's is present as an asset already into the ledger of peers or not
        // Fetch request's with the key from the blockchain.
        let property = await ctx.stub.getState(requestKey).catch(err => console.log(err));

        if (property.length == 0) return 'Property Registration Request not available for the property ' +
            ' having propertyID : ' + propertyId;

        let propertyJson = JSON.parse(property.toString());

        // Also check once from the propertyJson Object, that property has already been registered or otherwise
        // skip the process and notify that property already registered earlier.
        if (propertyJson['status'] === "registered" || propertyJson['status'] === "onSale")
            return 'Property having propertyID ' + propertyId + ' is already registered and approved.'

        propertyJson['status'] = "registered"; //else update the status key of the property objecy

        // Finally, update the ledger to mark that this property asset have been approved by the registrar.
        // As we Know that data can only be saved over the blokcchain network as bytes/buffers, so
        // converting that JSON to string first and then to the bytes to save over network using
        // Bufer.from method.
        const requestBuffer = Buffer.from(JSON.stringify(propertyJson));

        // putState - this method allows to store a particular state or an asset on top of the fabric n/w.
        await ctx.stub.putState(requestKey, requestBuffer);

        return propertyJson; //return Property Asset as an output.
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
        // Fetch user's with the key from the blockchain.
        let user = await ctx.stub.getState(ownerKey).catch(err => console.log(err));

        //
        if (user.length == 0) {
            // This marks that either there is some issue connecting blockchain or other issue or 
            // either the Asset does not EXISTS!!! . Thus skip further process.
            return 'Unable to fetch User\'s Asset with name ' + ownerName + ' & ssn ' + ownerSSN +
                ' , skip process of viewProperty as the user is not yet registered on the blockchain ';
        }

        // create a JSON Object from the user byte data
        let userJson = JSON.parse(user.toString());

        // Also, to check that the User(s) initiated the request has already been registered or not.
        // This is done by checking whether the User(s) Assets have key =="upgradConins" or otherwise 
        // skip the process.
        // NOTE: only the registered USER is allowed to proceed further.
        if (userJson["upgradCoins"] === undefined) {
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
            //return propertyJson['status']; //return the property status only
            return propertyJson; //return entire details of the property state to the caller
        }
        else
            return 'Property Asset for owner ' + ownerName + ' having social-security-number ' + ownerSSN +
                ' does not exist on the network';

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
                //return JSON.parse(user.toString());
                let userJson = JSON.parse(user.toString());
            
                // Also, check that this User is registered by the Registrar or not.
                if (userJson["upgradCoins"] === undefined) {
                    // This signifies that user is not yet registered, thus update the userJson to
                    // notify this state to the Caller.
                    userJson["status"]="NOT YET REGISTERED";
                } else userJson["status"]="REGISTERED";

                return userJson;
            } else {
                return 'Asset with name ' + name + ' & ssn ' + socialSecurityNumber +
                    ' having key ' + userKey + ' does not exist on the network';
            }
        } catch (error) {
            return ("ERROR : " + error);
        }
    }

}

// export this contract
module.exports = RegistrarContract;