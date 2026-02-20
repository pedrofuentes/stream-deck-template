/**
 * Plugin entry point — registers actions and connects to Stream Deck.
 *
 * @author __AUTHOR_SHORT__ <__AUTHOR_EMAIL__>
 * @copyright __AUTHOR_NAME__
 * @license MIT
 */

import streamDeck from "@elgato/streamdeck";

// Import and register your actions here:
// import { MyAction } from "./actions/my-action";
// streamDeck.actions.registerAction(new MyAction());

streamDeck.connect();
