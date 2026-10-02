export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string;
          created_at: string;
          id: string;
          is_default: boolean;
          label: string;
          landmark: string | null;
          line1: string;
          line2: string | null;
          name: string;
          phone: string;
          pincode: string;
          state: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          city: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          label?: string;
          landmark?: string | null;
          line1: string;
          line2?: string | null;
          name: string;
          phone: string;
          pincode: string;
          state: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          city?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          label?: string;
          landmark?: string | null;
          line1?: string;
          line2?: string | null;
          name?: string;
          phone?: string;
          pincode?: string;
          state?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_events: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          props: NonNullable<Json>;
          session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          props?: NonNullable<Json>;
          session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          props?: NonNullable<Json>;
          session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      answers: {
        Row: {
          body: string;
          brand_id: string | null;
          created_at: string;
          id: string;
          question_id: string;
          reported: boolean;
          user_id: string | null;
        };
        Insert: {
          body: string;
          brand_id?: string | null;
          created_at?: string;
          id?: string;
          question_id: string;
          reported?: boolean;
          user_id?: string | null;
        };
        Update: {
          body?: string;
          brand_id?: string | null;
          created_at?: string;
          id?: string;
          question_id?: string;
          reported?: boolean;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "answers_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      banners: {
        Row: {
          created_at: string;
          cta_label: string;
          ends_at: string | null;
          href: string;
          id: string;
          image_url: string;
          is_active: boolean;
          position: number;
          starts_at: string | null;
          subtitle: string | null;
          title: string;
        };
        Insert: {
          created_at?: string;
          cta_label?: string;
          ends_at?: string | null;
          href?: string;
          id?: string;
          image_url: string;
          is_active?: boolean;
          position?: number;
          starts_at?: string | null;
          subtitle?: string | null;
          title: string;
        };
        Update: {
          created_at?: string;
          cta_label?: string;
          ends_at?: string | null;
          href?: string;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          position?: number;
          starts_at?: string | null;
          subtitle?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      beauty_profiles: {
        Row: {
          budget: Database["public"]["Enums"]["budget_band"] | null;
          completed_at: string | null;
          concerns: string[];
          created_at: string;
          hair_type: Database["public"]["Enums"]["hair_type"] | null;
          shopping_for: string[];
          skin_tone: number | null;
          skin_type: Database["public"]["Enums"]["skin_type"] | null;
          style_prefs: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          budget?: Database["public"]["Enums"]["budget_band"] | null;
          completed_at?: string | null;
          concerns?: string[];
          created_at?: string;
          hair_type?: Database["public"]["Enums"]["hair_type"] | null;
          shopping_for?: string[];
          skin_tone?: number | null;
          skin_type?: Database["public"]["Enums"]["skin_type"] | null;
          style_prefs?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          budget?: Database["public"]["Enums"]["budget_band"] | null;
          completed_at?: string | null;
          concerns?: string[];
          created_at?: string;
          hair_type?: Database["public"]["Enums"]["hair_type"] | null;
          shopping_for?: string[];
          skin_tone?: number | null;
          skin_type?: Database["public"]["Enums"]["skin_type"] | null;
          style_prefs?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "beauty_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      brand_follows: {
        Row: {
          brand_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brand_follows_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_follows_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      brands: {
        Row: {
          about: string | null;
          certifications: string[];
          cover_url: string | null;
          created_at: string;
          follower_count: number;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
          socials: NonNullable<Json>;
          tagline: string | null;
          tier: number;
          verified: boolean;
        };
        Insert: {
          about?: string | null;
          certifications?: string[];
          cover_url?: string | null;
          created_at?: string;
          follower_count?: number;
          id?: string;
          logo_url?: string | null;
          name: string;
          slug: string;
          socials?: NonNullable<Json>;
          tagline?: string | null;
          tier?: number;
          verified?: boolean;
        };
        Update: {
          about?: string | null;
          certifications?: string[];
          cover_url?: string | null;
          created_at?: string;
          follower_count?: number;
          id?: string;
          logo_url?: string | null;
          name?: string;
          slug?: string;
          socials?: NonNullable<Json>;
          tagline?: string | null;
          tier?: number;
          verified?: boolean;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          cart_id: string;
          created_at: string;
          id: string;
          qty: number;
          saved_for_later: boolean;
          variant_id: string;
        };
        Insert: {
          cart_id: string;
          created_at?: string;
          id?: string;
          qty?: number;
          saved_for_later?: boolean;
          variant_id: string;
        };
        Update: {
          cart_id?: string;
          created_at?: string;
          id?: string;
          qty?: number;
          saved_for_later?: boolean;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variants";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          coupon_code: string | null;
          created_at: string;
          id: string;
          session_id: string | null;
          updated_at: string;
          use_points: boolean;
          user_id: string | null;
        };
        Insert: {
          coupon_code?: string | null;
          created_at?: string;
          id?: string;
          session_id?: string | null;
          updated_at?: string;
          use_points?: boolean;
          user_id?: string | null;
        };
        Update: {
          coupon_code?: string | null;
          created_at?: string;
          id?: string;
          session_id?: string | null;
          updated_at?: string;
          use_points?: boolean;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          image_url: string | null;
          name: string;
          parent_id: string | null;
          position: number;
          return_window_days: number;
          root: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          name: string;
          parent_id?: string | null;
          position?: number;
          return_window_days?: number;
          root?: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          name?: string;
          parent_id?: string | null;
          position?: number;
          return_window_days?: number;
          root?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      coupon_redemptions: {
        Row: {
          coupon_id: string;
          created_at: string;
          id: string;
          order_id: string;
          user_id: string | null;
        };
        Insert: {
          coupon_id: string;
          created_at?: string;
          id?: string;
          order_id: string;
          user_id?: string | null;
        };
        Update: {
          coupon_id?: string;
          created_at?: string;
          id?: string;
          order_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          code: string;
          created_at: string;
          description: string;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["coupon_kind"];
          max_discount: number | null;
          min_order: number;
          per_user_limit: number;
          pro_only: boolean;
          scope: Database["public"]["Enums"]["coupon_scope"];
          scope_id: string | null;
          starts_at: string;
          usage_limit: number | null;
          used_count: number;
          user_id: string | null;
          value: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          kind: Database["public"]["Enums"]["coupon_kind"];
          max_discount?: number | null;
          min_order?: number;
          per_user_limit?: number;
          pro_only?: boolean;
          scope?: Database["public"]["Enums"]["coupon_scope"];
          scope_id?: string | null;
          starts_at?: string;
          usage_limit?: number | null;
          used_count?: number;
          user_id?: string | null;
          value?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["coupon_kind"];
          max_discount?: number | null;
          min_order?: number;
          per_user_limit?: number;
          pro_only?: boolean;
          scope?: Database["public"]["Enums"]["coupon_scope"];
          scope_id?: string | null;
          starts_at?: string;
          usage_limit?: number | null;
          used_count?: number;
          user_id?: string | null;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "coupons_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      editorial_cards: {
        Row: {
          created_at: string;
          excerpt: string | null;
          href: string;
          id: string;
          image_url: string;
          is_active: boolean;
          position: number;
          title: string;
        };
        Insert: {
          created_at?: string;
          excerpt?: string | null;
          href?: string;
          id?: string;
          image_url: string;
          is_active?: boolean;
          position?: number;
          title: string;
        };
        Update: {
          created_at?: string;
          excerpt?: string | null;
          href?: string;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          position?: number;
          title?: string;
        };
        Relationships: [];
      };
      flash_sale_items: {
        Row: {
          flash_sale_id: string;
          product_id: string;
          sale_price: number;
        };
        Insert: {
          flash_sale_id: string;
          product_id: string;
          sale_price: number;
        };
        Update: {
          flash_sale_id?: string;
          product_id?: string;
          sale_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "flash_sale_items_flash_sale_id_fkey";
            columns: ["flash_sale_id"];
            isOneToOne: false;
            referencedRelation: "flash_sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flash_sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      flash_sales: {
        Row: {
          banner_url: string | null;
          created_at: string;
          ends_at: string;
          id: string;
          is_active: boolean;
          name: string;
          starts_at: string;
        };
        Insert: {
          banner_url?: string | null;
          created_at?: string;
          ends_at: string;
          id?: string;
          is_active?: boolean;
          name: string;
          starts_at: string;
        };
        Update: {
          banner_url?: string | null;
          created_at?: string;
          ends_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          starts_at?: string;
        };
        Relationships: [];
      };
      notification_prefs: {
        Row: {
          loyalty: boolean;
          offers: boolean;
          orders: boolean;
          personalised: boolean;
          reviews: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          loyalty?: boolean;
          offers?: boolean;
          orders?: boolean;
          personalised?: boolean;
          reviews?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          loyalty?: boolean;
          offers?: boolean;
          orders?: boolean;
          personalised?: boolean;
          reviews?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          href: string | null;
          id: string;
          read_at: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          href?: string | null;
          id?: string;
          read_at?: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          href?: string | null;
          id?: string;
          read_at?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_events: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          order_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          brand_name: string;
          category_root: string;
          id: string;
          image: string | null;
          line_total: number;
          mrp: number;
          name: string;
          non_returnable: boolean;
          order_id: string;
          product_id: string | null;
          product_slug: string;
          qty: number;
          return_window_days: number;
          returned_qty: number;
          unit_price: number;
          variant_id: string | null;
          variant_name: string;
        };
        Insert: {
          brand_name: string;
          category_root?: string;
          id?: string;
          image?: string | null;
          line_total: number;
          mrp: number;
          name: string;
          non_returnable?: boolean;
          order_id: string;
          product_id?: string | null;
          product_slug: string;
          qty: number;
          return_window_days?: number;
          returned_qty?: number;
          unit_price: number;
          variant_id?: string | null;
          variant_name: string;
        };
        Update: {
          brand_name?: string;
          category_root?: string;
          id?: string;
          image?: string | null;
          line_total?: number;
          mrp?: number;
          name?: string;
          non_returnable?: boolean;
          order_id?: string;
          product_id?: string | null;
          product_slug?: string;
          qty?: number;
          return_window_days?: number;
          returned_qty?: number;
          unit_price?: number;
          variant_id?: string | null;
          variant_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variants";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          address: NonNullable<Json>;
          awb: string | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          cod_fee: number;
          coupon_code: string | null;
          coupon_discount: number;
          courier: string | null;
          created_at: string;
          delivered_at: string | null;
          delivery_fee: number;
          delivery_slot: Database["public"]["Enums"]["delivery_slot"];
          estimated_delivery: string | null;
          guest_email: string | null;
          id: string;
          item_discount: number;
          order_number: string;
          payment_attempts: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          placed_at: string;
          points_awarded: boolean;
          points_discount: number;
          points_redeemed: number;
          session_id: string | null;
          shipped_at: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          tax: number;
          total: number;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          address: NonNullable<Json>;
          awb?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cod_fee?: number;
          coupon_code?: string | null;
          coupon_discount?: number;
          courier?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          delivery_fee?: number;
          delivery_slot?: Database["public"]["Enums"]["delivery_slot"];
          estimated_delivery?: string | null;
          guest_email?: string | null;
          id?: string;
          item_discount?: number;
          order_number: string;
          payment_attempts?: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          placed_at?: string;
          points_awarded?: boolean;
          points_discount?: number;
          points_redeemed?: number;
          session_id?: string | null;
          shipped_at?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          tax?: number;
          total: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          address?: NonNullable<Json>;
          awb?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cod_fee?: number;
          coupon_code?: string | null;
          coupon_discount?: number;
          courier?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          delivery_fee?: number;
          delivery_slot?: Database["public"]["Enums"]["delivery_slot"];
          estimated_delivery?: string | null;
          guest_email?: string | null;
          id?: string;
          item_discount?: number;
          order_number?: string;
          payment_attempts?: number;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          placed_at?: string;
          points_awarded?: boolean;
          points_discount?: number;
          points_redeemed?: number;
          session_id?: string | null;
          shipped_at?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          tax?: number;
          total?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      outbox: {
        Row: {
          body: string;
          channel: Database["public"]["Enums"]["outbox_channel"];
          created_at: string;
          id: string;
          payload: NonNullable<Json>;
          recipient: string;
          subject: string | null;
        };
        Insert: {
          body: string;
          channel: Database["public"]["Enums"]["outbox_channel"];
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          recipient: string;
          subject?: string | null;
        };
        Update: {
          body?: string;
          channel?: Database["public"]["Enums"]["outbox_channel"];
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          recipient?: string;
          subject?: string | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          attempt: number;
          created_at: string;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          order_id: string;
          provider: string;
          provider_ref: string | null;
          status: Database["public"]["Enums"]["payment_state"];
        };
        Insert: {
          amount: number;
          attempt?: number;
          created_at?: string;
          id?: string;
          method: Database["public"]["Enums"]["payment_method"];
          order_id: string;
          provider?: string;
          provider_ref?: string | null;
          status?: Database["public"]["Enums"]["payment_state"];
        };
        Update: {
          amount?: number;
          attempt?: number;
          created_at?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          order_id?: string;
          provider?: string;
          provider_ref?: string | null;
          status?: Database["public"]["Enums"]["payment_state"];
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      pincodes: {
        Row: {
          city: string;
          cod_available: boolean;
          courier: string;
          delivery_fee: number;
          next_day: boolean;
          pincode: string;
          same_day: boolean;
          standard_days: number;
          state: string;
        };
        Insert: {
          city: string;
          cod_available?: boolean;
          courier?: string;
          delivery_fee?: number;
          next_day?: boolean;
          pincode: string;
          same_day?: boolean;
          standard_days?: number;
          state: string;
        };
        Update: {
          city?: string;
          cod_available?: boolean;
          courier?: string;
          delivery_fee?: number;
          next_day?: boolean;
          pincode?: string;
          same_day?: boolean;
          standard_days?: number;
          state?: string;
        };
        Relationships: [];
      };
      points_ledger: {
        Row: {
          balance_after: number;
          created_at: string;
          delta: number;
          expires_at: string | null;
          id: string;
          reason: string;
          ref_id: string | null;
          ref_type: string | null;
          user_id: string;
        };
        Insert: {
          balance_after: number;
          created_at?: string;
          delta: number;
          expires_at?: string | null;
          id?: string;
          reason: string;
          ref_id?: string | null;
          ref_type?: string | null;
          user_id: string;
        };
        Update: {
          balance_after?: number;
          created_at?: string;
          delta?: number;
          expires_at?: string | null;
          id?: string;
          reason?: string;
          ref_id?: string | null;
          ref_type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "points_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          base_rating_count: number;
          base_rating_sum: number;
          benefits: string[];
          brand_id: string;
          category_id: string;
          certifications: string[];
          concerns: string[];
          created_at: string;
          description: string;
          finish: string | null;
          flagged_ingredients: string[];
          free_from: string[];
          how_to_use: string[];
          id: string;
          images: string[];
          ingredients: string[];
          is_active: boolean;
          launched_at: string;
          mrp: number;
          name: string;
          non_returnable: boolean;
          offer_buy: number;
          offer_get: number;
          offer_type: Database["public"]["Enums"]["offer_type"];
          price: number;
          pro_price: number | null;
          rating_avg: number;
          rating_count: number;
          search: unknown;
          skin_types: string[];
          slug: string;
          sold_count: number;
          tags: string[];
          updated_at: string;
          video_url: string | null;
          view_count: number;
        };
        Insert: {
          base_rating_count?: number;
          base_rating_sum?: number;
          benefits?: string[];
          brand_id: string;
          category_id: string;
          certifications?: string[];
          concerns?: string[];
          created_at?: string;
          description?: string;
          finish?: string | null;
          flagged_ingredients?: string[];
          free_from?: string[];
          how_to_use?: string[];
          id?: string;
          images?: string[];
          ingredients?: string[];
          is_active?: boolean;
          launched_at?: string;
          mrp: number;
          name: string;
          non_returnable?: boolean;
          offer_buy?: number;
          offer_get?: number;
          offer_type?: Database["public"]["Enums"]["offer_type"];
          price: number;
          pro_price?: number | null;
          rating_avg?: number;
          rating_count?: number;
          search?: unknown;
          skin_types?: string[];
          slug: string;
          sold_count?: number;
          tags?: string[];
          updated_at?: string;
          video_url?: string | null;
          view_count?: number;
        };
        Update: {
          base_rating_count?: number;
          base_rating_sum?: number;
          benefits?: string[];
          brand_id?: string;
          category_id?: string;
          certifications?: string[];
          concerns?: string[];
          created_at?: string;
          description?: string;
          finish?: string | null;
          flagged_ingredients?: string[];
          free_from?: string[];
          how_to_use?: string[];
          id?: string;
          images?: string[];
          ingredients?: string[];
          is_active?: boolean;
          launched_at?: string;
          mrp?: number;
          name?: string;
          non_returnable?: boolean;
          offer_buy?: number;
          offer_get?: number;
          offer_type?: Database["public"]["Enums"]["offer_type"];
          price?: number;
          pro_price?: number | null;
          rating_avg?: number;
          rating_count?: number;
          search?: unknown;
          skin_types?: string[];
          slug?: string;
          sold_count?: number;
          tags?: string[];
          updated_at?: string;
          video_url?: string | null;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          dob: string | null;
          email: string | null;
          id: string;
          lifetime_spend: number;
          marketing_consent: boolean;
          name: string | null;
          phone: string | null;
          points_balance: number;
          pro_until: string | null;
          referral_code: string;
          referral_rewarded_at: string | null;
          referred_by: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
          wallet_balance: number;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          dob?: string | null;
          email?: string | null;
          id: string;
          lifetime_spend?: number;
          marketing_consent?: boolean;
          name?: string | null;
          phone?: string | null;
          points_balance?: number;
          pro_until?: string | null;
          referral_code?: string;
          referral_rewarded_at?: string | null;
          referred_by?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          wallet_balance?: number;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          dob?: string | null;
          email?: string | null;
          id?: string;
          lifetime_spend?: number;
          marketing_consent?: boolean;
          name?: string | null;
          phone?: string | null;
          points_balance?: number;
          pro_until?: string | null;
          referral_code?: string;
          referral_rewarded_at?: string | null;
          referred_by?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          wallet_balance?: number;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey";
            columns: ["referred_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          product_id: string;
          reported: boolean;
          user_id: string | null;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          product_id: string;
          reported?: boolean;
          user_id?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          product_id?: string;
          reported?: boolean;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "questions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recently_viewed: {
        Row: {
          id: string;
          product_id: string;
          session_id: string | null;
          user_id: string | null;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          session_id?: string | null;
          user_id?: string | null;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          session_id?: string | null;
          user_id?: string | null;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recently_viewed_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recently_viewed_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      return_events: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          return_id: string;
          status: Database["public"]["Enums"]["return_status"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          return_id: string;
          status: Database["public"]["Enums"]["return_status"];
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          return_id?: string;
          status?: Database["public"]["Enums"]["return_status"];
        };
        Relationships: [
          {
            foreignKeyName: "return_events_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "returns";
            referencedColumns: ["id"];
          },
        ];
      };
      return_items: {
        Row: {
          id: string;
          order_item_id: string;
          qty: number;
          return_id: string;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          qty?: number;
          return_id: string;
        };
        Update: {
          id?: string;
          order_item_id?: string;
          qty?: number;
          return_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "return_items_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "returns";
            referencedColumns: ["id"];
          },
        ];
      };
      returns: {
        Row: {
          awb: string | null;
          comment: string | null;
          created_at: string;
          id: string;
          order_id: string;
          photos: string[];
          pickup_address: NonNullable<Json>;
          pickup_scheduled_for: string | null;
          reason: string;
          refund_amount: number;
          refund_method: Database["public"]["Enums"]["refund_method"];
          refunded_at: string | null;
          status: Database["public"]["Enums"]["return_status"];
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          awb?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          order_id: string;
          photos?: string[];
          pickup_address: NonNullable<Json>;
          pickup_scheduled_for?: string | null;
          reason: string;
          refund_amount?: number;
          refund_method?: Database["public"]["Enums"]["refund_method"];
          refunded_at?: string | null;
          status?: Database["public"]["Enums"]["return_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          awb?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          order_id?: string;
          photos?: string[];
          pickup_address?: NonNullable<Json>;
          pickup_scheduled_for?: string | null;
          reason?: string;
          refund_amount?: number;
          refund_method?: Database["public"]["Enums"]["refund_method"];
          refunded_at?: string | null;
          status?: Database["public"]["Enums"]["return_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "returns_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      review_votes: {
        Row: {
          created_at: string;
          review_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          review_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          review_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          body: string;
          brand_responded_at: string | null;
          brand_response: string | null;
          concerns: string[];
          created_at: string;
          helpful_count: number;
          id: string;
          order_item_id: string | null;
          photos: string[];
          points_awarded: boolean;
          product_id: string;
          rating: number;
          skin_type: string | null;
          status: Database["public"]["Enums"]["review_status"];
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          brand_responded_at?: string | null;
          brand_response?: string | null;
          concerns?: string[];
          created_at?: string;
          helpful_count?: number;
          id?: string;
          order_item_id?: string | null;
          photos?: string[];
          points_awarded?: boolean;
          product_id: string;
          rating: number;
          skin_type?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          brand_responded_at?: string | null;
          brand_response?: string | null;
          concerns?: string[];
          created_at?: string;
          helpful_count?: number;
          id?: string;
          order_item_id?: string | null;
          photos?: string[];
          points_awarded?: boolean;
          product_id?: string;
          rating?: number;
          skin_type?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: true;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_payment_methods: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["payment_method"];
          label: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["payment_method"];
          label: string;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["payment_method"];
          label?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_payment_methods_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      search_history: {
        Row: {
          created_at: string;
          id: string;
          query: string;
          session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          query: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          query?: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_alerts: {
        Row: {
          created_at: string;
          id: string;
          notified_at: string | null;
          user_id: string;
          variant_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notified_at?: string | null;
          user_id: string;
          variant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notified_at?: string | null;
          user_id?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_alerts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_alerts_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variants";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          user_id: string | null;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          kind?: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          user_id?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      variants: {
        Row: {
          id: string;
          is_default: boolean;
          kind: Database["public"]["Enums"]["variant_kind"];
          mrp: number;
          name: string;
          position: number;
          price: number;
          product_id: string;
          shade_hex: string | null;
          sku: string;
          stock: number;
        };
        Insert: {
          id?: string;
          is_default?: boolean;
          kind?: Database["public"]["Enums"]["variant_kind"];
          mrp: number;
          name: string;
          position?: number;
          price: number;
          product_id: string;
          shade_hex?: string | null;
          sku: string;
          stock?: number;
        };
        Update: {
          id?: string;
          is_default?: boolean;
          kind?: Database["public"]["Enums"]["variant_kind"];
          mrp?: number;
          name?: string;
          position?: number;
          price?: number;
          product_id?: string;
          shade_hex?: string | null;
          sku?: string;
          stock?: number;
        };
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlist_collections: {
        Row: {
          created_at: string;
          id: string;
          is_default: boolean;
          name: string;
          share_token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          share_token?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          share_token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_collections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlist_items: {
        Row: {
          collection_id: string;
          created_at: string;
          id: string;
          price_at_add: number;
          product_id: string;
          variant_id: string | null;
        };
        Insert: {
          collection_id: string;
          created_at?: string;
          id?: string;
          price_at_add: number;
          product_id: string;
          variant_id?: string | null;
        };
        Update: {
          collection_id?: string;
          created_at?: string;
          id?: string;
          price_at_add?: number;
          product_id?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_items_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "wishlist_collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlist_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_pro: { Args: { p_months?: number; p_user: string }; Returns: string };
      advance_order: {
        Args: {
          p_note?: string;
          p_order: string;
          p_status: Database["public"]["Enums"]["order_status"];
        };
        Returns: undefined;
      };
      advance_return: {
        Args: {
          p_note?: string;
          p_return: string;
          p_status: Database["public"]["Enums"]["return_status"];
        };
        Returns: undefined;
      };
      award_points: {
        Args: {
          p_delta: number;
          p_expires?: string;
          p_reason: string;
          p_ref_id?: string;
          p_ref_type?: string;
          p_user: string;
        };
        Returns: number;
      };
      cancel_order: { Args: { p_order: string; p_reason: string }; Returns: undefined };
      confirm_payment: { Args: { p_order: string; p_ref: string }; Returns: undefined };
      create_return: {
        Args: { p_order: string; p_payload: Json; p_user: string };
        Returns: string;
      };
      dearmor: { Args: { "": string }; Returns: string };
      fail_payment: { Args: { p_order: string }; Returns: Json };
      gen_random_uuid: { Args: Record<PropertyKey, never>; Returns: string };
      gen_salt: { Args: { "": string }; Returns: string };
      generate_referral_code: { Args: Record<PropertyKey, never>; Returns: string };
      grant_welcome_coupon: { Args: { p_user: string }; Returns: string };
      next_order_number: { Args: Record<PropertyKey, never>; Returns: string };
      notify_user: {
        Args: {
          p_body: string;
          p_channels?: Database["public"]["Enums"]["outbox_channel"][];
          p_href: string;
          p_title: string;
          p_type: Database["public"]["Enums"]["notification_type"];
          p_user: string;
        };
        Returns: undefined;
      };
      order_status_allowed: {
        Args: {
          p_from: Database["public"]["Enums"]["order_status"];
          p_to: Database["public"]["Enums"]["order_status"];
        };
        Returns: boolean;
      };
      pgp_armor_headers: { Args: { "": string }; Returns: Record<string, unknown>[] };
      place_order: { Args: { p_payload: Json; p_session: string; p_user: string }; Returns: Json };
      recompute_product_rating: { Args: { p_product: string }; Returns: undefined };
      restore_order_resources: { Args: { p_order: string }; Returns: undefined };
      show_limit: { Args: Record<PropertyKey, never>; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      submit_review: { Args: { p_payload: Json; p_user: string }; Returns: string };
      tier_multiplier: { Args: { p_tier: string }; Returns: number };
      user_spend_12m: { Args: { p_user: string }; Returns: number };
      user_tier: { Args: { p_user: string }; Returns: string };
    };
    Enums: {
      budget_band: "under_500" | "500_1500" | "1500_4000" | "4000_plus";
      coupon_kind: "percent" | "flat" | "free_delivery";
      coupon_scope: "all" | "brand" | "category";
      delivery_slot: "standard" | "next_day" | "same_day";
      hair_type: "straight" | "wavy" | "curly" | "coily";
      notification_type:
        | "order_confirmed"
        | "order_shipped"
        | "out_for_delivery"
        | "delivered"
        | "order_cancelled"
        | "back_in_stock"
        | "price_drop"
        | "flash_sale"
        | "abandoned_cart"
        | "browse_abandonment"
        | "weekly_digest"
        | "review_prompt"
        | "tier_upgrade"
        | "points_expiring"
        | "referral_reward"
        | "return_update"
        | "refund_processed"
        | "welcome"
        | "coupon"
        | "brand_launch"
        | "support";
      offer_type: "none" | "bxgy";
      order_status:
        | "placed"
        | "processing"
        | "shipped"
        | "out_for_delivery"
        | "delivered"
        | "failed_delivery"
        | "cancelled"
        | "return_initiated"
        | "returned"
        | "refunded";
      outbox_channel: "sms" | "email" | "push";
      payment_method:
        | "upi"
        | "card"
        | "netbanking"
        | "wallet"
        | "emi"
        | "bnpl"
        | "cod"
        | "giftcard";
      payment_state: "initiated" | "success" | "failed" | "refunded";
      payment_status: "pending" | "paid" | "cod_pending" | "failed" | "refunded";
      refund_method: "original" | "wallet";
      return_status:
        | "requested"
        | "pickup_scheduled"
        | "picked_up"
        | "received"
        | "refunded"
        | "rejected";
      review_status: "pending" | "approved" | "rejected";
      skin_type: "oily" | "dry" | "combination" | "normal" | "sensitive";
      ticket_status: "open" | "in_progress" | "resolved";
      user_role: "user" | "admin";
      variant_kind: "default" | "shade" | "size";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      budget_band: ["under_500", "500_1500", "1500_4000", "4000_plus"],
      coupon_kind: ["percent", "flat", "free_delivery"],
      coupon_scope: ["all", "brand", "category"],
      delivery_slot: ["standard", "next_day", "same_day"],
      hair_type: ["straight", "wavy", "curly", "coily"],
      notification_type: [
        "order_confirmed",
        "order_shipped",
        "out_for_delivery",
        "delivered",
        "order_cancelled",
        "back_in_stock",
        "price_drop",
        "flash_sale",
        "abandoned_cart",
        "browse_abandonment",
        "weekly_digest",
        "review_prompt",
        "tier_upgrade",
        "points_expiring",
        "referral_reward",
        "return_update",
        "refund_processed",
        "welcome",
        "coupon",
        "brand_launch",
        "support",
      ],
      offer_type: ["none", "bxgy"],
      order_status: [
        "placed",
        "processing",
        "shipped",
        "out_for_delivery",
        "delivered",
        "failed_delivery",
        "cancelled",
        "return_initiated",
        "returned",
        "refunded",
      ],
      outbox_channel: ["sms", "email", "push"],
      payment_method: ["upi", "card", "netbanking", "wallet", "emi", "bnpl", "cod", "giftcard"],
      payment_state: ["initiated", "success", "failed", "refunded"],
      payment_status: ["pending", "paid", "cod_pending", "failed", "refunded"],
      refund_method: ["original", "wallet"],
      return_status: [
        "requested",
        "pickup_scheduled",
        "picked_up",
        "received",
        "refunded",
        "rejected",
      ],
      review_status: ["pending", "approved", "rejected"],
      skin_type: ["oily", "dry", "combination", "normal", "sensitive"],
      ticket_status: ["open", "in_progress", "resolved"],
      user_role: ["user", "admin"],
      variant_kind: ["default", "shade", "size"],
    },
  },
} as const;
