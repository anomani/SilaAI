Table: addons

id: integer

name: text

price: numeric

duration: integer

compatible_appointment_types: ARRAY

user_id: integer

Table: ai_chat_messages

id: integer

thread_id: integer

message: text

role: character varying

created_at: timestamp without time zone

Table: ai_chat_threads

id: integer

title: character varying

user_id: integer

created_at: timestamp without time zone

last_message_at: timestamp without time zone

thread_id: character varying

Table: ai_prompts

clientid: integer

prompt: text

updated_at: timestamp without time zone

Table: ai_response_status

client_id: integer

status: character varying

created_at: timestamp without time zone

updated_at: timestamp without time zone

Table: appointment

id: integer

acuityid: integer

clientid: integer

date: text

starttime: text

endtime: text

appointmenttype: text

details: text

price: numeric

paid: boolean

tipamount: numeric

paymentmethod: character varying

addons: ARRAY

user_id: integer

Table: appointment_backup

id: integer

acuityid: integer

clientid: integer

date: text

starttime: text

endtime: text

appointmenttype: text

details: text

price: numeric

paid: boolean

tipamount: numeric

paymentmethod: character varying

addons: ARRAY

user_id: integer

Table: appointmenttypes

id: integer

name: text

price: numeric

duration: integer

group_number: integer

availability: jsonb

user_id: integer

Table: client

id: integer

firstname: text

lastname: text

phonenumber: text

email: text

notes: text

outreach_date: date

auto_respond: boolean

user_id: integer

Table: client_backup

id: integer

firstname: text

lastname: text

phonenumber: text

email: text

notes: text

outreach_date: date

Table: client_media

id: integer

client_id: integer

media_url: text

created_at: timestamp with time zone

media_type: character varying

thumbnail_url: text

user_id: integer

Table: messages

id: integer

fromtext: text

totext: text

body: text

date: text

clientid: integer

read: boolean

is_ai: boolean

user_id: integer

Table: messages_backup

id: integer

fromtext: text

totext: text

body: text

date: text

clientid: integer

read: boolean

Table: notes

id: integer

clientid: integer

content: text

createdat: timestamp without time zone

user_id: integer

Table: push_tokens

id: integer

user_id: integer

push_token: text

created_at: timestamp without time zone

Table: settings

user_id: character varying

feature_name: character varying

status: boolean

Table: suggestedresponses

id: integer

clientid: integer

response: text

createdat: timestamp without time zone

updatedat: timestamp without time zone

user_id: integer

type: character varying

Table: threads

id: integer

phone_number: character varying

thread_id: character varying

created_at: timestamp with time zone

user_id: integer

Table: users

id: integer

username: character varying

password: character varying

email: character varying

phone_number: character varying

is_barber: boolean

created_at: timestamp without time zone

business_number: character varying

calendarid: character varying

acuity_api_key: character varying

acuity_user_id: character varying

business_name: character varying

reminder_template: text

first_message_template: text

first_outreach_message: text

outreach_message: text

emailVerified: boolean

verificationToken: text

verificationTokenExpiry: timestamp without time zone

Table: waitlistrequest

id: integer

clientid: integer

requesttype: character varying

startdate: character varying

enddate: character varying

starttime: character varying

endtime: character varying

dayofweek: integer

appointmenttype: character varying

created_at: timestamp without time zone

notified: boolean

user_id: integer

