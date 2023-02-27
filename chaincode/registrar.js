'use strict';

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
        super('propertyreg');
    }

    // a. Instantiate
    //      - This function will be triggered or invoked as part of the deployment or commit 
    //        process when the chaincode is deployed on top of a Fabric Network.

    async instantiate(ctx) {
        console.log('Chaincode for Registrar is successfully deployed.');
    }
     /* 
     *  ASK : To create the User Assets.
     *  Initiator:  It will be the Registar. 
     *  Output:     A Response asset on the ledger will be the output. 
     *  Use case:   This transaction is called by the registar to approve the user 
     *              on the property-registration-network.*
    */
    async approveNewUser(ctx, name, socialSecurityNumber) {
        const userKey = ctx.stub.createCompositeKey('propertyreg.User.approve', [name, socialSecurityNumber]);

        const userBuffer = await ctx.stub.getState(userKey)
            .catch(err => console.log(err));
        if (userBuffer) {
            const user = JSON.parse(userBuffer.toString());
            const data = {
                upgradCoins: 0
            }
            user.push(data);
            user.docType = "User";

            return user;
        } else {
            return 'Asset with key ' + userKey + ' does not exist on the network';
        }
    }

    //2.  The registrar uses this function to create a new “Property” asset on the network 
    //    after performing certain manual checks on the request received for property registration.


    async approvePropertyRegistration(ctx, propertyID) {
        const propertyKey = ctx.stub.createCompositeKey('propertyreg.Property', [propertyID]);
        const propertyBuffer = await ctx.stub.getState(propertyKey)
            .catch(err => console.log(err));


        if (propertyBuffer) {
            const property = JSON.parse(propertyBuffer.toString());
            //code for approving property
            return property;
        } else {
            return 'Asset with key ' + propertyKey + ' does not exist on the network';
        }

    }
    /* 
     *  ASK :       To be used by Registrar's to view/inquire the current state of any property.
     *  Initiator:  It will be the Registrar in this SmartContract. 
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
}



