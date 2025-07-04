import { Request, Response } from 'express';
import { generateToken, verifyToken } from '../utils/token';
import { UserPreferences } from '../models/preferences.model'; 

export const unsubscribeEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { email, notificationType } = verifyToken(token);
    
    await UserPreferences.updateOne(
      { email },
      { $set: { [`preferences.${notificationType}`]: false } }
    );
    
    res.render('unsubscribe/success', { email });
  } catch (error) {
    res.status(400).send('Invalid unsubscribe link');
  }
};

export const getPreferenceCenter = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { email } = verifyToken(token);
  
  const preferences = await UserPreferences.findOne({ email });
  res.render('unsubscribe/preferences', { 
    email,
    preferences: preferences?.toObject() 
  });
};


export const sendGridWebhook = async (req: Request, res: Response) => {
    const { email, event } = req.body;
    
    if (event === 'unsubscribe') {
      await UserPreferences.updateOne(
        { email },
        { $set: { 'preferences.marketing': false } }
      );
    }
    
    res.status(200).send();
  };

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { email } = verifyToken(token);
    const { preferences } = req.body;

    await UserPreferences.updateOne(
      { email },
      { $set: { preferences } }
    );

    res.render('unsubscribe/success', { 
      email,
      message: 'Your preferences have been updated'
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update preferences' });
  }
};