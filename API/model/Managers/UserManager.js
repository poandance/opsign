const UserQueries = require('../../data/queries/UsersQueries');
const UserVersionQueries = require('../../data/queries/UsersVersionsQueries');
const VersionQueries = require('../../data/queries/VersionQueries');
const utils = require('../../model/Utils');
const assert = require('../Asserter');

/**
 * Adds a new user.
 * 
 * @param {Object} user - The user object to be added.
 * @param {string} user.first_name - The first name of the user.
 * @param {string} user.last_name - The last name of the user.
 * @param {string} user.email - The email of the user.
 * @returns {Promise} A promise that resolves with the added user.
 * @throws {AssertionError} If the user or any required fields are missing or invalid.
 */
async function add(user) {

    // Check if the user is provided
    assert(user, '[UserManager.add] The user is required');
    assert(user.first_name, '[UserManager.add] The first name is required');
    assert(user.last_name, '[UserManager.add] The last name is required');

    // trim first & last name to remove leading and trailing spaces and check if the name is not empty
    user.first_name = user.first_name.trim();
    assert(user.first_name, '[UserManager.add] The first name is required');

    user.last_name = user.last_name.trim();
    assert(user.last_name, '[UserManager.add] The last name is required');

    assert(user.email, '[UserManager.add] The email is required');
    assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email), '[UserManager.add] The email is not valid');

    return await UserQueries.add(user);

}

/**
 * Retrieves a user by their ID.
 *
 * @param {number} id - The ID of the user.
 * @returns {Promise<Object>} A promise that resolves to the user object.
 * @throws {Error} If the ID is not provided or is not a number.
 */
async function getById(id) {

    // Check if the ID is provided
    assert(id, '[UserManager.getById] The ID is required');

    id = parseInt(id);
    assert(id, '[UserManager.getById] The ID must be a number');

    return await UserVersionQueries.getById(id);

}

/**
 * Retrieves a user by their email address.
 *
 * @param {string} email - The email address of the user.
 * @returns {Promise<Object>} A promise that resolves to the user object.
 * @throws {Error} If the email is missing or not valid.
 */
async function getByEmail(email) {

    assert(email, '[UserManager.getByEmail] The email is required');

    // check if the mail follow the email pattern
    assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), '[UserManager.getByEmail] The email is not valid');

    return await UserQueries.getByEmail(email);

}

/**
 * Retrieves a user by document ID.
 *
 * @param {number} id - The document ID of the user.
 * @returns {Promise<Object>} - A promise that resolves to the user object.
 * @throws {Error} - If the document ID is missing or not a number.
 */
async function getByDocId(id) {

    assert(id, '[UserManager.getByDocId] The document ID is required');

    id = parseInt(id);
    assert(id, '[UserManager.getByDocId] The document ID must be a number');

    return await UserQueries.getByDocId(id);

}

/**
 * Retrieves signing page data based on the provided token.
 * @param {string} token - The token used to retrieve the signing page data.
 * @returns {Promise<Object>} The signing page data.
 * @throws {Error} If the token is not provided or if no data is found for the given token.
 */
async function getSigningPageData(token) {

    assert(token, '[UserManager.getSigningPageData] The token is required');

    const toReturn = await UserVersionQueries.getSigningPageData(token);

    assert(toReturn, 'No data found for the given token');

    // transform it to DD-MM-YYYY
    toReturn.docDate = toReturn.docDate.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });

    return toReturn;

}

/**
 * Archives a user by their version ID.
 *
 * @param {number} userVersionId - The version ID of the user to archive.
 * @returns {Promise} A promise that resolves when the user is successfully archived.
 * @throws {Error} If the userVersionId is missing or not a number.
 */
async function archive(userVersionId) {

    assert(userVersionId, '[UserManager.archive] The userVersionId is required');

    userVersionId = parseInt(userVersionId);
    assert(userVersionId, '[UserManager.archive] The userVersionId must be a number');

    return await UserQueries.archive(userVersionId);

}

/**
 * Generates a signing token for a user and a document.
 * @param {string} email - The email of the user.
 * @param {string} documentId - The ID of the document.
 * @returns {Promise<string>} The generated signing token.
 */
async function generateSigningToken(email, documentId) {

    assert(email, '[UserManager.generateSigningToken] The email is required');
    assert(documentId, '[UserManager.generateSigningToken] The documentId is required');

    // Generate a random token
    const tokens = await UserVersionQueries.getSigningTokens();

    let token = null;
    while (token == null || tokens.includes(token)) {
        token = utils.generateRandomToken(10, false);
    }

    // Get the user and version IDs
    const userId = (await UserQueries.getByEmail(email)).id;
    const versionId = (await VersionQueries.getLatest(documentId)).id;

    // Add the token to the database
    await UserVersionQueries.addSigningToken(userId, versionId, token);

    // Return the token
    return token;

}

/**
 * Signs a document with the given token and signature.
 * @param {string} token - The token used to identify the document.
 * @param {string} signature - The signature to be applied to the document.
 * @returns {Promise<string>} The signed document.
 */
async function sign(token, signature) {

    assert(token, '[UserManager.sign] The token is required');
    assert(signature, '[UserManager.sign] The signature is required');

    // Get the user version ID
    const userVersionId = await UserVersionQueries.getUserVersionIdByToken(token);

    // Sign the document
    await UserVersionQueries.signDoc(token, signature);

    const signedDocument = await UserManager.getSignedDoc(userVersionId);

    return signedDocument;

}

/**
 * Retrieves a version by its ID.
 *
 * @param {number} versionId - The ID of the version to retrieve.
 * @returns {Promise<Object>} A promise that resolves to the retrieved version object.
 * @throws {Error} If the version ID is missing or not a number.
 */
async function getVersion(versionId) {

    assert(versionId, '[UserManager.getVersion] The version ID is required');

    versionId = parseInt(versionId);
    assert(versionId, '[UserManager.getVersion] The version ID must be a number');

    return await VersionQueries.getById(versionId);

}

/**
 * Retrieves signing user data based on the provided user version ID.
 *
 * @param {number} userVersionId - The ID of the user version.
 * @returns {Promise<Object>} A promise that resolves to the signing user data.
 * @throws {Error} If the userVersionId is missing or not a number.
 */
async function getSigningUserData(userVersionId) {

    assert(userVersionId, '[UserManager.getSigningUserData] The userVersionId is required');

    userVersionId = parseInt(userVersionId);
    assert(userVersionId, '[UserManager.getSigningUserData] The userVersionId must be a number');

    return await UserVersionQueries.getSigningUserData(userVersionId);


}

async function getSigningUserImage(userVersionId) {

    assert(userVersionId, '[UserManager.getSigningUserImage] The userVersionId is required');

    userVersionId = parseInt(userVersionId);
    assert(userVersionId, '[UserManager.getSigningUserImage] The userVersionId must be a number');

    return await UserVersionQueries.getSigningUserImage(userVersionId);

}

module.exports = {
    add,
    getById,
    getByEmail,
    getByDocId,
    getSigningPageData,
    getSigningUserData,
    getSigningUserImage,
    archive,
    generateSigningToken,
    sign,
    getVersion
}