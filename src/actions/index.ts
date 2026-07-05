import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { Resend } from "resend";
import { getRawFile, saveRawFile } from "../libs/admin/github";
import { env } from "cloudflare:workers";

export const server = {
  contact: defineAction({
    accept: "form",
    input: z.object({
      name: z.string({ required_error: "Le nom est requis" }).min(2, "Le nom doit faire au moins 2 caractères").max(100),
      email: z.string({ required_error: "L'e-mail est requis" }).email("Veuillez renseigner un email valide"),
      phone: z.string().optional(),
      message: z.string({ required_error: "Le message est requis" }).min(10, "Le message doit faire au moins 10 caractères").max(5000),
      "cf-turnstile-response": z.string({ required_error: "Validation anti-spam requise" }),
    }),
    handler: async (input) => {
      // 1. Vérifier le token Turnstile
      const turnstileSecret = env?.TURNSTILE_SECRET_KEY || import.meta.env.TURNSTILE_SECRET_KEY;
      const formData = new FormData();
      formData.append("secret", turnstileSecret);
      formData.append("response", input["cf-turnstile-response"]);

      const turnstileRes = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        { method: "POST", body: formData }
      );
      const turnstileData = await turnstileRes.json();

      if (!turnstileData.success) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Vérification anti-spam échouée.",
        });
      }

      // 2. Envoyer l'email via Resend
      const resendApiKey = env?.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
      const contactFrom = env?.CONTACT_FROM_EMAIL || import.meta.env.CONTACT_FROM_EMAIL;
      const contactTo = env?.CONTACT_TO_EMAIL || import.meta.env.CONTACT_TO_EMAIL;

      const resend = new Resend(resendApiKey);
      const { error } = await resend.emails.send({
        from: `Contact Site <${contactFrom}>`,
        to: [contactTo],
        subject: `Nouveau message de ${input.name}`,
        html: `
          <h2>Nouveau message depuis le formulaire de contact</h2>
          <p><strong>Nom :</strong> ${input.name}</p>
          <p><strong>Email :</strong> ${input.email}</p>
          <p><strong>Téléphone :</strong> ${input.phone || "Non renseigné"}</p>
          <hr/>
          <p>${input.message.replace(/\n/g, "<br/>")}</p>
        `,
        replyTo: input.email,
      });

      if (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'envoi du message.",
        });
      }

      return { success: true };
    },
  }),
  admin: {
    getRobots: defineAction({
      handler: async () => {
        const file = await getRawFile("public/robots.txt", env);
        if (!file) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "robots.txt non trouvé",
          });
        }
        return file;
      },
    }),
    saveRobots: defineAction({
      input: z.object({
        content: z.string(),
        sha: z.string(),
      }),
      handler: async (input) => {
        const res = await saveRawFile(
          "public/robots.txt",
          input.content,
          "Update robots.txt",
          input.sha,
          env
        );
        if (!res.success) {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: res.message || "Échec de la sauvegarde",
          });
        }
        return { success: true };
      },
    }),
    getSeoConfig: defineAction({
      handler: async () => {
        const file = await getRawFile("src/data/seo-config.json", env);
        if (!file) {
          // Return default empty config if file doesn't exist yet
          return {
            content: JSON.stringify({
              global: {
                og: { siteName: "", defaultImage: "", defaultImageAlt: "", locale: "fr_FR", type: "website" },
                jsonLd: []
              },
              pages: {}
            }, null, 2),
            sha: "",
            path: "src/data/seo-config.json"
          };
        }
        return file;
      },
    }),
    saveSeoConfig: defineAction({
      input: z.object({
        content: z.string(),
        sha: z.string(),
      }),
      handler: async (input) => {
        // Validate JSON before saving
        try {
          JSON.parse(input.content);
        } catch {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Le contenu n'est pas un JSON valide.",
          });
        }
        const res = await saveRawFile(
          "src/data/seo-config.json",
          input.content,
          "Update SEO config",
          input.sha || undefined,
          env
        );
        if (!res.success) {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: res.message || "Échec de la sauvegarde",
          });
        }
        return { success: true };
      },
    }),
  },
};

